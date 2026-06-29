import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Loader2, Award, ExternalLink } from "lucide-react";

export default function VerifyCertificate() {
  const { uid } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verify() {
      setLoading(true);
      setError("");
      try {
        const { API_URL } = await import("../api");
        const res = await fetch(`${API_URL}/api/v2/certificates/verify/${encodeURIComponent(uid)}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Certificate not found or has been deleted.");
          }
          throw new Error("Failed to verify certificate details.");
        }
        
        const data = await res.json();
        setCert(data);
      } catch (err) {
        setError(err.message || "Certificate verification failed");
        setCert(null);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-650" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white/60 p-8 rounded-3xl shadow-glass border border-white/60 backdrop-blur-md text-left flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-extrabold text-gray-950 mb-2">
            Verification Failed
          </h1>
          <p className="text-gray-600 text-xs leading-relaxed text-center">
            {error || "This certificate could not be verified or has been revoked."}
          </p>
          <Link to="/" className="mt-6 text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl transition shadow-xs">
            Return to Shyoski Home
          </Link>
        </div>
      </div>
    );
  }

  const isRevoked = cert.status === "revoked";

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="bg-white/60 border border-white/60 shadow-glass rounded-3xl max-w-xl w-full p-8 text-center relative overflow-hidden animate-fadeIn backdrop-blur-md">
        {/* Certificate Watermark Icon */}
        <Award className="absolute -top-12 -right-12 w-40 h-40 text-blue-50 opacity-10 pointer-events-none" />

        {isRevoked ? (
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        ) : (
          <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
        )}

        <h1 className="text-2xl font-extrabold text-gray-950 tracking-wide">
          {isRevoked ? "Certificate Revoked" : "Certificate Verified"}
        </h1>

        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
          {isRevoked 
            ? "WARNING: This certificate is no longer active and has been revoked by the issuing authority." 
            : "This certificate of completion is authentic and has been successfully verified via the platform database."}
        </p>

        {/* Revocation Warning Box */}
        {isRevoked && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-left text-xs text-red-750 space-y-1">
            <p><strong>Reason:</strong> {cert.revocationReason || "REFUND"}</p>
            {cert.replacedBy && (
              <p>
                <strong>Replaced By:</strong>{" "}
                <Link to={`/verify/${cert.replacedBy}`} className="text-blue-650 hover:underline">
                  {cert.replacedBy} <ExternalLink className="w-3 h-3 inline mb-0.5" />
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Certificate detail card */}
        <div className="mt-6 text-left space-y-3.5 text-sm text-gray-700 bg-white/80 p-6 rounded-2xl border border-gray-150 shadow-2xs">
          <div className="flex justify-between border-b border-gray-150 pb-2">
            <span className="text-gray-500">Candidate Name</span>
            <span className="font-bold text-gray-950">{cert.studentName}</span>
          </div>

          <div className="flex justify-between border-b border-gray-150 pb-2">
            <span className="text-gray-500">Program Cohort</span>
            <span className="font-bold text-gray-950">{cert.batchName}</span>
          </div>

          <div className="flex justify-between border-b border-gray-150 pb-2">
            <span className="text-gray-500">Issuing Organization</span>
            <span className="font-bold text-gray-950">{cert.organizationName}</span>
          </div>

          <div className="flex justify-between border-b border-gray-150 pb-2">
            <span className="text-gray-500">Certificate Number</span>
            <span className="font-mono text-xs text-gray-950">{cert.certificateNumber}</span>
          </div>

          <div className="flex justify-between border-b border-gray-150 pb-2">
            <span className="text-gray-500">Completion Date</span>
            <span className="font-mono text-xs text-gray-950">
              {cert.completionDate ? new Date(cert.completionDate).toLocaleDateString() : "N/A"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Verification Status</span>
            <span className={`font-bold ${isRevoked ? "text-red-650" : "text-green-700"}`}>
              {isRevoked ? "REVOKED / INVALID" : "VERIFIED & VALID"}
            </span>
          </div>
        </div>

        <div className="mt-6 text-[10px] text-gray-400 leading-relaxed font-mono">
          This digital certificate is cryptographically signed and tracked for audit logging compliance. Re-verification can be initiated at any time.
        </div>
      </div>
    </div>
  );
}
