
import { useEffect, useState } from "react";
import { Loader2, Check, X, ExternalLink, Trash2, Edit, Plus, Layers, FileText, Users, Mail, Briefcase } from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState('submissions'); 
  
  // Data State
  const [submissions, setSubmissions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Batch Form State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({ batchCode: "", title: "", startDate: "", certificateFee: 0, googleFormLink: "" });

  // Jobs Form State
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobFormData, setJobFormData] = useState({ title: "", department: "", location: "", jobType: "", description: "", googleFormLink: "" });

  // Student List & Add Student State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Add student to batch
  const [studentEmail, setStudentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  function triggerConfirm(title, message, onConfirm) {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  // Initial Load
  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      const { API_URL } = await import('../api');
      if (activeTab === 'submissions') {
        const res = await fetch(`${API_URL}/admin/submissions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSubmissions(data.submissions || []);
      } else if (activeTab === 'batches') {
        const res = await fetch(`${API_URL}/admin/batches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBatches(data || []);
      } else if (activeTab === 'jobs') {
        const res = await fetch(`${API_URL}/admin/jobs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setJobs(data || []);
      }
    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- SUBMISSION ACTIONS ---
  async function handleEvaluate(id, status) {
    triggerConfirm(
      "Evaluate Submission",
      `Are you sure you want to ${status} this work?`,
      async () => {
        try {
          const { API_URL } = await import('../api');
          await fetch(`${API_URL}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionId: id,
              status: status,
              feedback: status === 'approved' ? "Great job!" : "Please review requirements.",
              evaluatorId: "admin_1"
            })
          });
          loadData();
        } catch (err) { alert(err.message); }
      }
    );
  }


  // --- BATCH ACTIONS ---
  async function handleAddStudentToBatch(e) {
    e.preventDefault();
    if (!studentEmail || !currentBatch) {
      alert("Please enter an email and select a batch");
      return;
    }
    
    setAddingStudent(true);
    try {
      const { API_URL } = await import('../api');
      console.log("Adding student:", { studentEmail, batchId: currentBatch._id });
      
      const res = await fetch(`${API_URL}/admin/add-student-to-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          batchId: currentBatch._id
        })
      });

      const data = await res.json();
      console.log("Response:", data);

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      console.log("Verification status:", data.verified);
      if (!data.verified) {
        alert("⚠️ Warning: Student may not have been added properly. Check browser console.");
      } else {
        alert("✓ Student added to batch successfully!");
      }
      
      setStudentEmail("");
      // Refresh student list in modal
      await fetchStudents(currentBatch._id);
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Error: " + err.message);
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleSaveBatch(e) {
    e.preventDefault();
    const { API_URL } = await import('../api');
    const endpoint = editingBatch 
      ? `${API_URL}/admin/batches/${editingBatch._id}`
      : `${API_URL}/admin/batches`;
    
    const method = editingBatch ? 'PUT' : 'POST';

    try {
      console.log(`Sending ${method} request to ${endpoint}`, formData);
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const responseText = await res.text();
      console.log(`Response status: ${res.status}, body:`, responseText);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${responseText}`);
      
      const data = JSON.parse(responseText);
      console.log("Success:", data);
      
      setShowBatchModal(false);
      setEditingBatch(null);
      setFormData({ batchCode: "", title: "", startDate: "", certificateFee: 0, googleFormLink: "" });
      loadData();
    } catch (err) { 
      console.error("Batch save error:", err);
      alert(err.message); 
    }
  }

  async function handleDeleteBatch(id) {
    triggerConfirm(
      "Delete Batch",
      "Are you sure you want to delete this batch? This cannot be undone.",
      async () => {
        try {
          const { API_URL } = await import('../api');
          await fetch(`${API_URL}/admin/batches/${id}`, { method: 'DELETE' });
          loadData();
        } catch (err) { alert(err.message); }
      }
    );
  }

  // --- STUDENT LIST ACTIONS ---
  async function viewStudents(batch) {
    setCurrentBatch(batch); // Store full batch for ID reference
    setShowStudentModal(true);
    setLoadingStudents(true);
    fetchStudents(batch._id);
  }

  async function fetchStudents(batchId) {
    try {
      const { API_URL } = await import('../api');
      const res = await fetch(`${API_URL}/admin/batches/${batchId}/students`);
      const data = await res.json();
      setBatchStudents(data || []);
    } catch {
      alert("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }


  function openEditModal(batch) {
    setEditingBatch(batch);
    setFormData({
      batchCode: batch.batchCode,
      title: batch.title,
      startDate: batch.startDate ? batch.startDate.split('T')[0] : "",
      certificateFee: batch.certificateFee,
      googleFormLink: batch.googleFormLink || "",
      isActive: batch.isActive
    });
    setShowBatchModal(true);
  }

  function openCreateModal() {
    setEditingBatch(null);
    setFormData({ batchCode: "", title: "", startDate: "", certificateFee: 0, googleFormLink: "" });
    setShowBatchModal(true);
  }

  // --- JOB ACTIONS ---
  async function handleSaveJob(e) {
    e.preventDefault();
    const { API_URL } = await import('../api');
    const endpoint = editingJob 
      ? `${API_URL}/admin/jobs/${editingJob._id}`
      : `${API_URL}/admin/jobs`;
    
    const method = editingJob ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobFormData)
      });
      if (!res.ok) throw new Error("Failed to save job");
      
      setShowJobModal(false);
      setEditingJob(null);
      setJobFormData({ title: "", department: "", location: "", jobType: "", description: "", googleFormLink: "" });
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function handleDeleteJob(id) {
    triggerConfirm(
      "Delete Job",
      "Are you sure you want to delete this job opening? This cannot be undone.",
      async () => {
        try {
          const { API_URL } = await import('../api');
          await fetch(`${API_URL}/admin/jobs/${id}`, { method: 'DELETE' });
          loadData();
        } catch (err) { alert(err.message); }
      }
    );
  }

  function openEditJobModal(job) {
    setEditingJob(job);
    setJobFormData({
      title: job.title,
      department: job.department || "",
      location: job.location || "",
      jobType: job.jobType,
      description: job.description || "",
      googleFormLink: job.googleFormLink || ""
    });
    setShowJobModal(true);
  }

  function openCreateJobModal() {
    setEditingJob(null);
    setJobFormData({ title: "", department: "", location: "", jobType: "", description: "", googleFormLink: "" });
    setShowJobModal(true);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button onClick={() => setActiveTab('submissions')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'submissions' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <FileText className="w-4 h-4 mr-2" /> Submissions
            </button>
            <button onClick={() => setActiveTab('batches')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'batches' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Layers className="w-4 h-4 mr-2" /> Batches
            </button>
            <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center ${activeTab === 'jobs' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Briefcase className="w-4 h-4 mr-2" /> Jobs
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
        ) : activeTab === 'submissions' ? (
          submissions.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow text-center text-slate-500">No pending submissions.</div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub._id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase">Week {sub.weekNumber}</span>
                      <span className="text-sm text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                    <div className="font-medium text-slate-900 mb-1">Student ID: {sub.uid}</div>
                    <a href={sub.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
                      <ExternalLink className="w-3 h-3 mr-1" /> View Code
                    </a>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={() => handleEvaluate(sub._id, 'rejected')} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition"><X className="w-5 h-5" /></button>
                    <button onClick={() => handleEvaluate(sub._id, 'approved')} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition"><Check className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'batches' ? (
          <div>
            <div className="flex justify-end mb-6">
              <button onClick={openCreateModal} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg">
                <Plus className="w-4 h-4 mr-2" /> Create New Batch
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {batches.map((batch) => (
                <div key={batch._id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="text-xl font-bold text-slate-800">{batch.title}</h3>
                       <p className="text-sm text-slate-500 font-mono">{batch.batchCode}</p>
                     </div>
                     <span className={`px-2 py-1 text-xs font-bold rounded ${batch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                       {batch.isActive ? 'ACTIVE' : 'ARCHIVED'}
                     </span>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-2">
                    {/* View Students Button */}
                    <button 
                      onClick={() => viewStudents(batch)}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Users className="w-4 h-4 mr-2" /> View & Add Students
                    </button>
                    
                    <div className="flex space-x-2">
                      <button onClick={() => openEditModal(batch)} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteBatch(batch._id)} className="p-2 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-6">
              <button onClick={openCreateJobModal} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg">
                <Plus className="w-4 h-4 mr-2" /> Post New Job
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <div key={job._id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="text-xl font-bold text-slate-800">{job.title}</h3>
                       {job.department && <p className="text-sm text-slate-500">{job.department}</p>}
                       {job.location && <p className="text-xs text-slate-400">{job.location}</p>}
                     </div>
                     <span className={`px-2 py-1 text-xs font-bold rounded ${job.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                       {job.isActive ? 'ACTIVE' : 'CLOSED'}
                     </span>
                  </div>
                  
                  {job.jobType && <p className="text-sm text-slate-600 mb-3"><strong>Type:</strong> {job.jobType}</p>}
                  {job.description && <p className="text-sm text-slate-600 mb-4 line-clamp-2">{job.description}</p>}
                  
                  <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-2">
                    <a href={job.googleFormLink} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center">
                      <ExternalLink className="w-4 h-4 mr-1" /> View Form
                    </a>
                    
                    <div className="flex space-x-2">
                      <button onClick={() => openEditJobModal(job)} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteJob(job._id)} className="p-2 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* JOB MODAL */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">{editingJob ? "Edit Job" : "Post New Job"}</h2>
            <form onSubmit={handleSaveJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Job Title</label>
                <input required className="w-full p-2 border rounded" value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} placeholder="e.g. Senior Developer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Department</label>
                <input className="w-full p-2 border rounded" value={jobFormData.department} onChange={e => setJobFormData({...jobFormData, department: e.target.value})} placeholder="e.g. Engineering" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Location</label>
                <input className="w-full p-2 border rounded" value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} placeholder="e.g. Bengaluru, India" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Job Type</label>
                <select required className="w-full p-2 border rounded" value={jobFormData.jobType} onChange={e => setJobFormData({...jobFormData, jobType: e.target.value})}>
                  <option value="">Select Job Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea className="w-full p-2 border rounded" value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} placeholder="Job description..." rows="3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Application Form Link</label>
                <input type="url" required className="w-full p-2 border rounded" value={jobFormData.googleFormLink} onChange={e => setJobFormData({...jobFormData, googleFormLink: e.target.value})} placeholder="https://forms.google.com/..." />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowJobModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl my-8">
            <h2 className="text-2xl font-bold mb-6">{editingBatch ? "Edit Batch" : "New Batch"}</h2>
            <form onSubmit={handleSaveBatch} className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700">Batch Code (Unique ID)</label>
                <input required className="w-full p-2 border rounded" value={formData.batchCode} onChange={e => setFormData({...formData, batchCode: e.target.value})} placeholder="e.g. JAN-2025" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Batch Title</label>
                <input required className="w-full p-2 border rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Full Stack Internship" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Start Date</label>
                <input required type="date" className="w-full p-2 border rounded" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Domain</label>
                <select className="w-full p-2 border rounded" value={formData.domain || ''} onChange={e => setFormData({...formData, domain: e.target.value})}>
                  <option value="">Select Domain</option>
                  <option value="Full Stack">Full Stack</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Mobile Development">Mobile Development</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Certificate Fee (₹)</label>
                <input type="number" required className="w-full p-2 border rounded" value={formData.certificateFee} onChange={e => setFormData({...formData, certificateFee: e.target.value})} placeholder="0 for free" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Application Form Link</label>
                <input type="url" required className="w-full p-2 border rounded" value={formData.googleFormLink} onChange={e => setFormData({...formData, googleFormLink: e.target.value})} placeholder="https://forms.google.com/..." />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowBatchModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800">Save Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENTS LIST MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden h-[80vh] flex flex-col">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold">{currentBatch?.title}</h3>
                <p className="text-sm text-slate-400">Manage Enrollment</p>
              </div>
              <button onClick={() => setShowStudentModal(false)}><X className="w-6 h-6 hover:text-slate-300"/></button>
            </div>
            
            {/* ADD STUDENT SECTION */}
            <div className="p-6 bg-slate-50 border-b border-slate-200">
               <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                 <Plus className="w-4 h-4 mr-1"/> Add Student to Batch
               </h4>
               <form onSubmit={handleAddStudentToBatch} className="flex gap-3">
                 <div className="relative flex-1">
                   <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                   <input 
                     type="email" 
                     required 
                     placeholder="student@gmail.com" 
                     className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     value={studentEmail}
                     onChange={(e) => setStudentEmail(e.target.value)}
                   />
                 </div>
                 <button 
                   disabled={addingStudent}
                   className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                 >
                   {addingStudent ? <Loader2 className="animate-spin" /> : "Add"}
                 </button>
               </form>
               <p className="text-xs text-slate-500 mt-2">
                 * Student must have already signed up with this email. Enter the email and they'll get access to this batch's dashboard.
               </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingStudents ? (
                <div className="flex justify-center mt-10"><Loader2 className="animate-spin" /></div>
              ) : batchStudents.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">No students registered in this batch yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="p-3 text-sm font-bold text-slate-500 uppercase">Name</th>
                        <th className="p-3 text-sm font-bold text-slate-500 uppercase">Email</th>
                        <th className="p-3 text-sm font-bold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents.map((student) => (
                        <tr key={student.uid} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{student.displayName}</td>
                          <td className="p-3 text-slate-600">{student.email}</td>
                          <td className="p-3">
                             {student.progress?.isCertified ? (
                               <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                 Certified
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                 Active
                               </span>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
               <div className="text-xs text-slate-500 mr-auto flex items-center">
                 Total Students: <strong>{batchStudents.length}</strong>
               </div>
               <button onClick={() => setShowStudentModal(false)} className="px-4 py-2 bg-white border border-slate-300 rounded text-slate-700 font-bold text-sm hover:bg-slate-100">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Custom General Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-gray-900 border border-gray-200 shadow-xl text-left space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-955">{confirmModal.title || "Are you sure?"}</h3>
              <p className="text-xs text-gray-555 mt-2 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-250 text-gray-750 text-xs font-bold rounded-xl cursor-pointer hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-650 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}