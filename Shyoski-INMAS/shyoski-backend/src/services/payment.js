// src/services/payment.js
import { ObjectId } from 'mongodb'
import { AuditService } from './audit.js'
import { NotificationService } from './notification.js'
import Razorpay from 'razorpay'

export class PaymentService {
  /**
   * Instantiates Razorpay SDK client with key settings.
   */
  static getRazorpay(env) {
    const keyId = env.RAZORPAY_KEY_ID || 'rzp_test_RuEbt8x1Tq8bWV'
    const keySecret = env.RAZORPAY_KEY_SECRET || 'cSNeMWrZ2s2O1OT53rpdwv4L'
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  }

  /**
   * Checks or creates an order on Razorpay for a student cohort payment.
   */
  static async createOrder(db, orgId, batchId, actor, batch, env) {
    if (!batch.certificateFee) {
      throw { status: 400, message: 'No certificate fee configured for this batch' }
    }

    const activePayment = await db.collection('payments').findOne({
      batchId: new ObjectId(batchId),
      uid: actor.uid,
      status: 'created'
    })

    if (activePayment) {
      return {
        id: activePayment.orderId,
        entity: 'order',
        amount: activePayment.amount,
        currency: activePayment.currency,
        receipt: `receipt_${actor.uid.slice(0, 10)}`,
        status: 'created'
      }
    }

    const rzp = PaymentService.getRazorpay(env)
    const options = {
      amount: batch.certificateFee * 100, // in paise
      currency: 'INR',
      receipt: `receipt_${actor.uid.slice(0, 10)}`
    }

    const order = await rzp.orders.create(options)

    const paymentDoc = {
      organizationId: new ObjectId(orgId),
      batchId: new ObjectId(batchId),
      uid: actor.uid,
      orderId: order.id,
      paymentId: null,
      amount: options.amount,
      currency: options.currency,
      status: 'created',
      signature: null,
      refundId: null,
      refundedAmount: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('payments').insertOne(paymentDoc)
    return order
  }

  /**
   * Cascades refund actions to set payment, batch enrollment, and revoke active certificates.
   */
  static async handleRefundCascade(db, paymentRecord, refundId, refundedAmount) {
    await db.collection('payments').updateOne(
      { _id: paymentRecord._id },
      {
        $set: {
          status: 'refunded',
          refundId: refundId,
          refundedAmount: refundedAmount,
          updatedAt: new Date()
        }
      }
    )

    await db.collection('batch_enrollments').updateOne(
      { batchId: paymentRecord.batchId, uid: paymentRecord.uid },
      {
        $set: {
          hasPaid: false,
          updatedAt: new Date()
        }
      }
    )

    const certificate = await db.collection('certificates').findOne({
      batchId: paymentRecord.batchId,
      uid: paymentRecord.uid,
      status: { $ne: 'revoked' }
    })
    if (certificate) {
      await db.collection('certificates').updateOne(
        { _id: certificate._id },
        {
          $set: {
            status: 'revoked',
            revocationReason: 'REFUND',
            revokedAt: new Date()
          }
        }
      )
      await AuditService.createLog(db, {
        actorUid: 'system',
        organizationId: paymentRecord.organizationId.toString(),
        action: 'CERTIFICATE_REVOKE',
        resourceType: 'certificate',
        resourceId: certificate._id.toString(),
        metadata: { reason: 'REFUND', paymentId: paymentRecord.paymentId }
      })
    }

    await AuditService.createLog(db, {
      actorUid: 'system',
      organizationId: paymentRecord.organizationId.toString(),
      action: 'PAYMENT_REFUND',
      resourceType: 'payment',
      resourceId: paymentRecord._id.toString(),
      metadata: { paymentId: paymentRecord.paymentId, refundId, amount: refundedAmount }
    })

    // Notify student of refund
    const amountInRupees = refundedAmount / 100
    await NotificationService.createNotification(db, {
      organizationId: paymentRecord.organizationId,
      uid: paymentRecord.uid,
      type: 'PAYMENT_REFUNDED',
      title: 'Payment Refunded',
      message: `A refund of ₹${amountInRupees} has been successfully processed.`,
      entityType: 'payment',
      entityId: paymentRecord._id.toString(),
      eventKey: `PAYMENT_REFUNDED:${paymentRecord.paymentId}:${refundId}`
    })
  }

  /**
   * Processes an admin-triggered refund.
   */
  static async processRefund(db, orgId, paymentId, refundAmount, env) {
    const paymentRecord = await db.collection('payments').findOne({ paymentId })
    if (!paymentRecord) {
      throw { status: 404, message: 'Payment not found' }
    }

    if (paymentRecord.organizationId.toString() !== orgId) {
      throw { status: 400, message: 'Payment organization mismatch' }
    }

    if (paymentRecord.status !== 'captured') {
      throw { status: 400, message: 'Only captured payments can be refunded' }
    }

    const rzp = PaymentService.getRazorpay(env)
    const refundParams = {}
    if (refundAmount) {
      refundParams.amount = refundAmount
    }

    const refund = await rzp.payments.refund(paymentId, refundParams)
    await PaymentService.handleRefundCascade(db, paymentRecord, refund.id, refundAmount || paymentRecord.amount)
    return refund.id
  }

  /**
   * Handles webhook events, ensuring idempotency and status transitions.
   */
  static async processWebhook(db, event) {
    if (event.event === 'payment.captured') {
      const paymentObj = event.payload.payment.entity
      const orderId = paymentObj.order_id
      const paymentId = paymentObj.id

      const paymentRecord = await db.collection('payments').findOne({ orderId })
      if (paymentRecord && paymentRecord.status !== 'captured') {
        await db.collection('payments').updateOne(
          { _id: paymentRecord._id },
          {
            $set: {
              status: 'captured',
              paymentId,
              updatedAt: new Date()
            }
          }
        )

        await db.collection('batch_enrollments').updateOne(
          { batchId: paymentRecord.batchId, uid: paymentRecord.uid },
          {
            $set: {
              hasPaid: true,
              paymentId,
              paymentOrderId: orderId,
              updatedAt: new Date()
            }
          }
        )

        await AuditService.createLog(db, {
          actorUid: paymentRecord.uid,
          organizationId: paymentRecord.organizationId.toString(),
          action: 'PAYMENT_CAPTURE',
          resourceType: 'payment',
          resourceId: paymentRecord._id.toString(),
          metadata: { orderId, paymentId, amount: paymentRecord.amount }
        })

        // Notify student about payment capture
        const amountInRupees = paymentRecord.amount / 100
        await NotificationService.createNotification(db, {
          organizationId: paymentRecord.organizationId,
          uid: paymentRecord.uid,
          type: 'PAYMENT_CAPTURED',
          title: 'Payment Captured',
          message: `Payment of ₹${amountInRupees} was successfully captured.`,
          entityType: 'payment',
          entityId: paymentRecord._id.toString(),
          eventKey: `PAYMENT_CAPTURED:${paymentRecord.orderId}`
        })
      }
    } else if (event.event === 'payment.failed') {
      const paymentObj = event.payload.payment.entity
      const orderId = paymentObj.order_id
      await db.collection('payments').updateOne(
        { orderId },
        {
          $set: {
            status: 'failed',
            updatedAt: new Date()
          }
        }
      )
    } else if (event.event === 'refund.processed') {
      const refundObj = event.payload.refund.entity
      const paymentId = refundObj.payment_id
      const refundId = refundObj.id
      const amount = refundObj.amount

      const paymentRecord = await db.collection('payments').findOne({ paymentId })
      if (paymentRecord && paymentRecord.status !== 'refunded') {
        await PaymentService.handleRefundCascade(db, paymentRecord, refundId, amount)
      }
    }
  }
}
