// src/services/certificate.js
import { ObjectId } from 'mongodb'
import { AuditService } from './audit.js'
import { EnrollmentService } from './enrollment.js'
import { NotificationService } from './notification.js'
import crypto from 'node:crypto'

function generateAssetHash(value) {
  if (!value) return null
  return crypto.createHash('sha256').update(value).digest('hex')
}

export class CertificateService {
  /**
   * Evaluates student eligibility and claims a certificate.
   */
  static async claimCertificate(db, orgId, batchId, actor) {
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) })
    if (!org || org.status !== 'active') {
      throw { status: 400, message: 'Bad Request: Organization is inactive' }
    }

    const batch = await db.collection('batches').findOne({ _id: new ObjectId(batchId) })
    if (!batch) {
      throw { status: 404, message: 'Batch not found' }
    }

    // Check eligibility using core graduates business logic
    const eligibility = await EnrollmentService.checkCertificateEligibility(db, orgId, batchId, actor.uid)
    if (!eligibility.eligible) {
      throw { status: 400, message: 'Bad Request: Student is not eligible for graduation', details: eligibility }
    }

    // Fetch student profile details
    const studentProfile = await db.collection('users').findOne({ uid: actor.uid })
    if (!studentProfile) {
      throw { status: 404, message: 'Not Found: Student profile not initialized' }
    }

    // Increment sequence counter atomically on batch record to avoid concurrency serial race conditions
    const updatedBatch = await db.collection('batches').findOneAndUpdate(
      { _id: new ObjectId(batchId) },
      { $inc: { certificateSequence: 1 } },
      { returnDocument: 'after' }
    )

    const sequence = updatedBatch.certificateSequence || 1
    const serial = String(sequence).padStart(6, '0')
    const currentYear = new Date().getFullYear()
    const certificateNumber = `SHY-${currentYear}-${org.organizationCode}-${batch.batchCode}-${serial}`.toUpperCase()

    // Define metadata snapshot properties with cryptographic asset hashes
    const orgLogoUrl = org.logoUrl || null
    const orgLogoHash = generateAssetHash(orgLogoUrl)

    const orgFounderName = org.founderName || 'Org Founder'
    const orgFounderSignatureUrl = org.founderSignatureUrl || '/signatures/org-founder.png'
    const orgFounderSignatureHash = generateAssetHash(orgFounderSignatureUrl)

    const shyoskiFounderName = 'Shyoski Founder'
    const shyoskiFounderSignatureUrl = '/signatures/shyoski-founder.png'
    const shyoskiFounderSignatureHash = generateAssetHash(shyoskiFounderSignatureUrl)

    const verificationUrl = `https://verify.shyoski.in/${certificateNumber}`

    const certificateDoc = {
      organizationId: new ObjectId(orgId),
      batchId: new ObjectId(batchId),
      uid: actor.uid,
      certificateNumber,
      verificationUrl,
      status: 'active',
      templateVersion: 'v1',
      pdfUrl: null,
      replacedBy: null,
      revocationReason: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      snapshot: {
        studentName: studentProfile.displayName || studentProfile.email.split('@')[0],
        studentEmail: studentProfile.email,
        organizationName: org.name,
        organizationCode: org.organizationCode,
        organizationLogoUrl: orgLogoUrl,
        organizationLogoHash: orgLogoHash,
        organizationFounderName: orgFounderName,
        organizationFounderSignatureUrl: orgFounderSignatureUrl,
        organizationFounderSignatureHash: orgFounderSignatureHash,
        shyoskiFounderName,
        shyoskiFounderSignatureUrl,
        shyoskiFounderSignatureHash,
        batchName: batch.name,
        batchCode: batch.batchCode,
        domain: batch.domain || 'General',
        completionDate: new Date(),
        issuedAt: new Date()
      }
    }

    try {
      const result = await db.collection('certificates').insertOne(certificateDoc)

      await AuditService.createLog(db, {
        actorUid: actor.uid,
        organizationId: orgId,
        action: 'CERTIFICATE_CLAIM',
        resourceType: 'certificate',
        resourceId: result.insertedId.toString(),
        metadata: { certificateNumber }
      })

      // Emit claim notification
      await NotificationService.createNotification(db, {
        organizationId: new ObjectId(orgId),
        uid: actor.uid,
        type: 'CERTIFICATE_CLAIMED',
        title: 'Certificate Claimed',
        message: `Congratulations! You have claimed your certificate for cohort "${batch.name}".`,
        entityType: 'certificate',
        entityId: result.insertedId.toString(),
        eventKey: `CERTIFICATE_CLAIMED:${certificateNumber}`
      })

      return { ...certificateDoc, _id: result.insertedId.toString() }
    } catch (err) {
      if (err.code === 11000) {
        throw { status: 409, message: 'Conflict: Active certificate already exists for this batch enrollment' }
      }
      throw err
    }
  }

  /**
   * Reissues an active certificate.
   */
  static async reissueCertificate(db, orgId, certNumber, actor, body) {
    const oldCert = await db.collection('certificates').findOne({ certificateNumber: certNumber })
    if (!oldCert) {
      throw { status: 404, message: 'Not Found: Target certificate does not exist' }
    }

    if (oldCert.organizationId.toString() !== orgId) {
      throw { status: 400, message: 'Bad Request: Certificate tenant boundary mismatch' }
    }

    if (oldCert.status !== 'active') {
      throw { status: 400, message: 'Bad Request: Only active certificates can be reissued' }
    }

    const correctedName = body.studentName || oldCert.snapshot.studentName

    // Resolve Org & Batch records for generating subsequent serials
    const org = await db.collection('organizations').findOne({ _id: oldCert.organizationId })
    const batch = await db.collection('batches').findOne({ _id: oldCert.batchId })
    if (!org || !batch) {
      throw { status: 404, message: 'Not Found: Batch or Organization references missing' }
    }

    // Increment sequence counter atomically on batch record to avoid concurrency serial race conditions
    const updatedBatch = await db.collection('batches').findOneAndUpdate(
      { _id: oldCert.batchId },
      { $inc: { certificateSequence: 1 } },
      { returnDocument: 'after' }
    )

    const sequence = updatedBatch.certificateSequence || 1
    const serial = String(sequence).padStart(6, '0')
    const currentYear = new Date().getFullYear()
    const newCertificateNumber = `SHY-${currentYear}-${org.organizationCode}-${batch.batchCode}-${serial}`.toUpperCase()

    const verificationUrl = `https://verify.shyoski.in/${newCertificateNumber}`

    const newCertDoc = {
      organizationId: oldCert.organizationId,
      batchId: oldCert.batchId,
      uid: oldCert.uid,
      certificateNumber: newCertificateNumber,
      verificationUrl,
      status: 'active',
      templateVersion: oldCert.templateVersion || 'v1',
      pdfUrl: null,
      replacedBy: null,
      reissuedFrom: oldCert.certificateNumber,
      revocationReason: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      snapshot: {
        ...oldCert.snapshot,
        studentName: correctedName,
        issuedAt: new Date()
      }
    }

    // Revoke the old certificate document with 'REPLACED' reason first to prevent unique active index violation
    await db.collection('certificates').updateOne(
      { _id: oldCert._id },
      {
        $set: {
          status: 'revoked',
          revocationReason: 'REPLACED',
          replacedBy: newCertificateNumber,
          revokedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    let result
    try {
      result = await db.collection('certificates').insertOne(newCertDoc)
    } catch (insertError) {
      // Rollback old certificate state if inserting the replacement fails
      await db.collection('certificates').updateOne(
        { _id: oldCert._id },
        {
          $set: {
            status: oldCert.status,
            revocationReason: oldCert.revocationReason || null,
            replacedBy: oldCert.replacedBy || null,
            revokedAt: oldCert.revokedAt || null,
            updatedAt: new Date()
          }
        }
      )
      throw insertError
    }

    // Log both revoke & reissue actions in the audit logs
    await AuditService.createLog(db, {
      actorUid: actor.uid,
      organizationId: orgId,
      action: 'CERTIFICATE_REVOKE',
      resourceType: 'certificate',
      resourceId: oldCert._id.toString(),
      metadata: { reason: 'REPLACED', replacedBy: newCertificateNumber }
    })

    await AuditService.createLog(db, {
      actorUid: actor.uid,
      organizationId: orgId,
      action: 'CERTIFICATE_REISSUE',
      resourceType: 'certificate',
      resourceId: result.insertedId.toString(),
      metadata: { certificateNumber: newCertificateNumber, reissuedFrom: oldCert.certificateNumber }
    })

    // Emit reissue notification to target student
    await NotificationService.createNotification(db, {
      organizationId: oldCert.organizationId,
      uid: oldCert.uid,
      type: 'CERTIFICATE_REISSUED',
      title: 'Certificate Reissued',
      message: `Your certificate for "${batch.name}" has been reissued with serial ${newCertificateNumber}.`,
      entityType: 'certificate',
      entityId: result.insertedId.toString(),
      eventKey: `CERTIFICATE_REISSUED:${newCertificateNumber}`
    })

    return { ...newCertDoc, _id: result.insertedId.toString() }
  }
}
