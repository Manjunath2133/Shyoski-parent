
// import { useEffect, useState, useRef } from "react";
// import { useAuth } from "../context/AuthContext";
// import { getUserProfile } from "../api";
// import QRCode from "react-qr-code";
// import { Loader2, Download, ShieldCheck, Ban } from "lucide-react";

// export default function Certificate() {
//   const { currentUser } = useAuth();
//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const certRef = useRef(null);

//   useEffect(() => {
//     async function loadProfile() {
//       if (currentUser?.uid) {
//         const data = await getUserProfile(currentUser.uid);
//         setProfile(data);
//       }
//       setLoading(false);
//     }
//     loadProfile();
//   }, [currentUser]);

//   const handlePrint = () => {
//     window.print();
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <Loader2 className="animate-spin w-8 h-8 text-slate-600" />
//       </div>
//     );
//   }

//   // ❌ Access control
//   if (!profile?.progress?.isCertified) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
//         <div className="bg-red-100 p-4 rounded-full mb-4">
//           <Ban className="w-10 h-10 text-red-600" />
//         </div>
//         <h1 className="text-2xl font-bold text-slate-900 mb-2">
//           Access Denied
//         </h1>
//         <p className="text-slate-600 max-w-md">
//           You have not completed the internship requirements yet.
//           Please complete all mandatory tasks to unlock your certificate.
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-4 print:bg-white print:p-0">

//       {/* Action Bar */}
//       <div className="mb-6 print:hidden">
//         <button
//           onClick={handlePrint}
//           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-full shadow-lg transition"
//         >
//           <Download className="w-5 h-5" />
//           Download / Print
//         </button>
//       </div>

//       {/* ================= CERTIFICATE ================= */}
//       <div
//         ref={certRef}
//         className="relative bg-white w-[1100px] h-[750px] p-4 shadow-2xl
//                   print:w-full print:h-screen print:shadow-none"
//       >

//         {/* OUTER BORDER – Authority */}
//         <div className="relative w-full h-full border-[14px] border-slate-900">

//           {/* MIDDLE BORDER – Structure */}
//           <div className="relative w-full h-full border-4 border-slate-300 p-3">

//             {/* INNER BORDER – Premium Detail */}
//             <div className="grid grid-rows-[1fr_auto] w-full h-full border border-blue-700 p-0">


        
    

//         {/* Header */}
//         <div className="flex flex-col items-center text-center">
//           <img
//             src="/logo1.png"
//             alt="Shyoski Enterprise Logo"
//             className="h-20 mb-4"
//           />

//           <h1 className="text-5xl font-serif font-bold uppercase tracking-wider">
//             Certificate of Completion
//           </h1>

//           <div className="w-40 h-[3px] bg-blue-700 my-4" />

//           <p className="text-sm tracking-widest uppercase text-slate-600">
//             This certificate is proudly presented to
//           </p>
//         </div>

//         {/* Candidate Name */}
//         <div className="mt-10 text-center">
//           <h2 className="text-5xl font-bold font-serif text-blue-900 border-b-2 border-slate-300 inline-block px-12 pb-3">
//             {profile.displayName}
//           </h2>
//         </div>

//         {/* Description */}
//         <div className="mt-8 px-24 text-center">
//           <p className="text-lg text-slate-700 leading-relaxed">
//             For successfully completing the
//             <span className="font-bold text-slate-900">
//               {" "}Full Stack Development Internship Program{" "}
//             </span>
//             at <span className="font-bold">Shyoski</span>.
//             The intern has demonstrated strong technical skills, professional
//             work ethic, and the ability to build scalable applications using
//             modern technologies.
//           </p>
//         </div>

//         {/* Footer */}
//         <div className="mt-16 px-20 h-[180px] flex justify-between items-end">

//           {/* LEFT: Signatures column (FIXED HEIGHT) */}
//           <div className="h-[150px] flex items-end">
//             <div className="flex gap-28 items-end">

//               {/* CEO */}
//               <div className="flex flex-col items-center w-56">
//                 <div className="h-20 flex items-end justify-center mb-2">
//                   <img
//                     src="/ceo-sign.png"
//                     alt="CEO Signature"
//                     className="max-h-20 object-contain"
//                   />
//                 </div>
//                 <div className="border-t w-full pt-2 text-sm font-bold uppercase text-center">
//                   CEO & Co-Founder
//                 </div>
//                 <div className="text-xs text-slate-500 text-center">
//                   Shyoski
//                 </div>
//               </div>

//               {/* Chairman */}
//               <div className="flex flex-col items-center w-56">
//                 <div className="h-20 flex items-end justify-center mb-2">
//                   <img
//                     src="/chairman-sign.png"
//                     alt="Chairman Signature"
//                     className="max-h-[110px] object-contain filter contrast-[2.6] brightness-[0.5] saturate-[1.4]"

//                   />
//                 </div>
//                 <div className="border-t w-full pt-2 text-sm font-bold uppercase text-center">
//                   Chairman
//                 </div>
//                 <div className="text-xs text-slate-500 text-center">
//                   Shyoski
//                 </div>
//               </div>

//             </div>
//           </div>

//           {/* RIGHT: QR column (SAME HEIGHT) */}
//           <div className="w-40 h-[150px] flex flex-col items-center justify-end text-center">
//             <div className="border-2 border-slate-900 p-2 bg-white">
//               <QRCode
//                 value={`https://shyoski.in/verify/${profile.uid}`}
//                 size={90}
//                 level="H"
//               />
//             </div>

//             <div className="mt-2 flex items-center justify-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">
//               <ShieldCheck className="w-4 h-4 mr-1 text-green-600" />
//               Verified Certificate
//             </div>

//             <div className="text-[10px] text-slate-500 font-mono mt-1 whitespace-nowrap">
//               Certificate ID: {profile.uid.slice(0, 10)}
//             </div>
//           </div>

//         </div>
      
//       </div>
//       </div>
//       </div>

//       </div>
//     </div>
//   );
// }

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../api";
import QRCode from "react-qr-code";
import { Loader2, Download, ShieldCheck, Ban } from "lucide-react";

export default function Certificate() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const certRef = useRef(null);

  useEffect(() => {
    async function loadProfile() {
      if (currentUser?.uid) {
        try {
          const data = await getUserProfile(currentUser.uid);
          setProfile(data);
        } catch (err) {
          console.error("Failed to load user profile in Certificate:", err);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [currentUser]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-900">
        <Loader2 className="animate-spin w-8 h-8 text-blue-650" />
      </div>
    );
  }

  if (!profile?.progress?.isCertified) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-white/50 border border-white/50 rounded-3xl mt-10 space-y-4 shadow-sm text-left">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 mb-2 border border-red-100">
          <Ban className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-955">Access Denied</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          You have not completed the internship requirements yet. Please complete all mandatory weekly tasks to unlock your certificate.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-transparent flex flex-col items-center justify-center p-4 print:bg-white print:p-0">

      {/* Action Bar */}
      <div className="mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition-all text-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download / Print Certificate
        </button>
      </div>

      {/* ================= CERTIFICATE CONTAINER ================= */}
      <div className="overflow-x-auto w-full flex justify-center py-4 print:py-0">
        <div
          ref={certRef}
          className="bg-white w-[1100px] shadow-glass border border-gray-200/50 p-4 rounded-xs print:shadow-none print:border-none print:p-0"
        >

          {/* OUTER BORDER */}
          <div className="border-[14px] border-slate-900 p-3">

            {/* MIDDLE BORDER */}
            <div className="border-4 border-slate-300 p-3">

              {/* INNER BORDER */}
              <div className="border border-blue-700 px-20 py-14 text-center bg-white">

                {/* HEADER */}
                <img
                  src="/logo1.png"
                  alt="Shyoski Logo"
                  className="h-20 mx-auto mb-6"
                />

                <h1 className="text-5xl font-serif font-bold uppercase tracking-wider text-slate-900">
                  Certificate of Completion
                </h1>

                <div className="w-40 h-[3px] bg-blue-700 mx-auto my-5" />

                <p className="text-sm tracking-widest uppercase text-slate-500">
                  This certificate is proudly presented to
                </p>

                {/* NAME */}
                <div className="my-10">
                  <h2 className="text-5xl font-serif font-bold text-blue-900 border-b-2 border-slate-300 inline-block px-12 pb-3">
                    {profile.displayName}
                  </h2>
                </div>

                {/* DESCRIPTION */}
                <p className="max-w-3xl mx-auto text-lg text-slate-700 leading-relaxed">
                  For successfully completing the
                  <span className="font-bold text-slate-900">
                    {" "}Full Stack Development Internship Program{" "}
                  </span>
                  at <span className="font-bold text-slate-900">Shyoski</span>.
                  The intern has demonstrated strong technical skills,
                  professional work ethic, and the ability to build scalable
                  applications using modern technologies.
                </p>

                {/* FOOTER */}
                <div className="mt-20 flex justify-between items-end text-left">

                  {/* SIGNATURES */}
                  <div className="flex gap-28 items-end">

                    {/* CEO */}
                    <div className="w-56 flex flex-col items-center">
                      <div className="h-25 flex items-end justify-center mb-2">
                        <img
                          src="/ceo-sign.png"
                          alt="CEO Signature"
                          className="max-h-20 object-contain"
                        />
                      </div>
                      <div className="border-t border-slate-300 w-full pt-2 font-bold uppercase text-xs text-center text-slate-900">
                        CEO & Co-Founder
                      </div>
                      <div className="text-xs text-slate-500 text-center">
                        Shyoski
                      </div>
                    </div>

                    {/* CHAIRMAN */}
                    <div className="w-56 flex flex-col items-center">
                      <div className="h-20 flex items-end justify-center mb-2">
                        <img
                          src="/chairman-sign.png"
                          alt="Chairman Signature"
                          className="max-h-30 object-contain filter contrast-[2.6] brightness-[0.5]"
                        />
                      </div>
                      <div className="border-t border-slate-300 w-full pt-2 font-bold uppercase text-xs text-center text-slate-900">
                        Chairman
                      </div>
                      <div className="text-xs text-slate-500 text-center">
                        Shyoski
                      </div>
                    </div>

                  </div>

                  {/* QR */}
                  <div className="w-36 text-center">
                    <QRCode
                      value={`https://shyoski.in/verify/${profile.uid}`}
                      size={90}
                      level="H"
                      className="mx-auto"
                    />

                    <div className="mt-2 flex justify-center items-center text-xs font-bold uppercase whitespace-nowrap text-slate-900">
                      <ShieldCheck className="w-4 h-4 mr-1 text-green-600" />
                      Verified Certificate
                    </div>

                    <div className="text-[10px] text-slate-555 font-mono mt-1 whitespace-nowrap">
                      Certificate ID: {profile.uid.slice(0, 10)}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
