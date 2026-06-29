import { useEffect, useState, Fragment } from "react";
import { authenticatedFetch } from "../api";
import { useTenant } from "../context/TenantContext";
import {
  Loader2, Users, Layers, Shield, Briefcase, Settings, ArrowRight, Plus,
  Trash2, Edit, CheckCircle, Clock, Lock, FileText, Mail, Download, Search, ChevronLeft, ChevronRight, UserPlus, X
} from "lucide-react";

export default function OrgAdminDashboard() {
  const { activeOrg } = useTenant();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [members, setMembers] = useState([]);
  const [jobs, setJobs] = useState([]);
  
  // Auditing scoped
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({ action: "", severity: "", limit: "15" });
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Forms / Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchFormData, setBatchFormData] = useState({ batchCode: "", title: "", domain: "", startDate: "", certificateFee: 0, googleFormLink: "", status: "draft" });

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("student");

  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobFormData, setJobFormData] = useState({ title: "", department: "", location: "", jobType: "Full-time", description: "", googleFormLink: "" });

  // Batch Enrollment Management Modal
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollEmail, setEnrollEmail] = useState("");
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
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  // Job Candidates Modal
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);

  // Branding editor
  const [brandingForm, setBrandingForm] = useState({ logoUrl: "", primaryColor: "#2563eb", website: "", contactEmail: "", contactPhone: "" });
  const [savingBranding, setSavingBranding] = useState(false);

  // Syllabus Management Modal
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [selectedSyllabusBatch, setSelectedSyllabusBatch] = useState(null);
  const [syllabusAssignments, setSyllabusAssignments] = useState([]);
  const [newAssignmentForm, setNewAssignmentForm] = useState({ week: 1, title: "", description: "", submissionType: "individual" });
  const [savingSyllabus, setSavingSyllabus] = useState(false);

  // Staff Management Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStaffBatch, setSelectedStaffBatch] = useState(null);
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [assignForm, setAssignForm] = useState({ uid: "", role: "mentor" });
  const [savingStaff, setSavingStaff] = useState(false);

  // Fetch dashboards and data
  useEffect(() => {
    if (!activeOrg) return;
    loadTabDetails();
  }, [activeTab, activeOrg]);

  async function loadTabDetails() {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const data = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/dashboard?forceReload=true`);
        setDashboardData(data);
      } else if (activeTab === "batches") {
        const data = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches?limit=100`);
        setBatches(data.data || []);
      } else if (activeTab === "members") {
        const data = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/members?limit=100`);
        setMembers(data.data || []);
      } else if (activeTab === "jobs") {
        const data = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/jobs`);
        setJobs(data.data || []);
      } else if (activeTab === "compliance") {
        fetchComplianceAudits(1);
      } else if (activeTab === "branding") {
        setBrandingForm({
          logoUrl: activeOrg.logoUrl || "",
          primaryColor: activeOrg.settings?.branding?.primaryColor || "#2563eb",
          website: activeOrg.website || "",
          contactEmail: activeOrg.contactEmail || "",
          contactPhone: activeOrg.settings?.contact?.phone || ""
        });
      }
    } catch (err) {
      console.error("Failed to load tab data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Compliance auditer
  async function fetchComplianceAudits(page = 1) {
    try {
      const q = new URLSearchParams();
      q.append("page", page.toString());
      q.append("limit", auditFilters.limit);
      if (auditFilters.action) q.append("action", auditFilters.action);
      if (auditFilters.severity) q.append("severity", auditFilters.severity);

      const logs = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/audit-logs?${q.toString()}`);
      setAuditLogs(logs.data || []);
      setAuditTotalPages(logs.pagination?.totalPages || 1);
      setAuditPage(page);
    } catch (e) {
      console.error(e);
    }
  }

  const exportOrgAuditsToCSV = async () => {
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/audit-logs/export`);
      const logsToExport = res.data || [];
      if (logsToExport.length === 0) {
        alert("No logs available for export");
        return;
      }
      const headers = ["Timestamp", "Action", "Actor UID", "Resource Type", "Resource ID", "Severity", "Metadata"];
      const rows = logsToExport.map(log => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.actorUid,
        log.resourceType || "",
        log.resourceId || "",
        log.severity || "INFO",
        JSON.stringify(log.metadata || {})
      ]);
      const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `compliance_logs_${activeOrg.slug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export compliance logs: " + err.message);
    }
  };

  // --- BRANDING SAVER ---
  async function handleSaveBranding(e) {
    e.preventDefault();
    setSavingBranding(true);
    try {
      // 1. Update Core settings
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: activeOrg.name,
          slug: activeOrg.slug,
          logoUrl: brandingForm.logoUrl,
          website: brandingForm.website,
          contactEmail: brandingForm.contactEmail
        })
      });

      // 2. Update Layout specific settings
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/settings`, {
        method: "PUT",
        body: JSON.stringify({
          branding: {
            logoUrl: brandingForm.logoUrl,
            primaryColor: brandingForm.primaryColor,
            website: brandingForm.website
          },
          contact: {
            email: brandingForm.contactEmail,
            phone: brandingForm.contactPhone
          }
        })
      });

      alert("Branding details updated successfully! Reloading...");
      window.location.reload();
    } catch (err) {
      alert("Failed to save organization branding details: " + err.message);
    } finally {
      setSavingBranding(false);
    }
  }

  // --- MEMBER CONTROL ACTIONS ---
  async function handleInviteMember(e) {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      alert(`Invitation sent successfully to ${inviteEmail}!`);
      setShowMemberModal(false);
      setInviteEmail("");
      loadTabDetails();
    } catch (err) {
      alert("Failed to invite member: " + err.message);
    }
  }

  async function handleUpdateMember(uid, status, role) {
    triggerConfirm(
      "Update Member Membership",
      "Are you sure you want to update this member's membership details?",
      async () => {
        try {
          await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/members/${uid}`, {
            method: "PATCH",
            body: JSON.stringify({ status, role })
          });
          alert("Membership details updated successfully!");
          loadTabDetails();
        } catch (err) {
          alert(err.message);
        }
      }
    );
  }

  async function handleRemoveMember(uid) {
    triggerConfirm(
      "Remove Member Membership",
      "Are you sure you want to remove this member's membership? This cannot be undone.",
      async () => {
        try {
          await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/members/${uid}`, {
            method: "DELETE"
          });
          alert("Membership successfully removed!");
          loadTabDetails();
        } catch (err) {
          alert(err.message);
        }
      }
    );
  }

  // --- BATCH MANAGEMENT ACTIONS ---
  async function handleSaveBatch(e) {
    e.preventDefault();
    try {
      const path = editingBatch 
        ? `/api/v2/organizations/${activeOrg._id}/batches/${editingBatch._id}`
        : `/api/v2/organizations/${activeOrg._id}/batches`;
      const method = editingBatch ? "PUT" : "POST";

      await authenticatedFetch(path, {
        method,
        body: JSON.stringify({
          ...batchFormData,
          name: batchFormData.title,
          startDate: batchFormData.startDate ? new Date(batchFormData.startDate).toISOString() : null
        })
      });

      alert("Batch saved successfully!");
      setShowBatchModal(false);
      setEditingBatch(null);
      loadTabDetails();
    } catch (err) {
      alert(err.message);
    }
  }

  async function viewEnrollments(batch) {
    setSelectedBatch(batch);
    setShowEnrollmentModal(true);
    setEnrollmentLoading(true);
    try {
      const data = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batch._id}/enrollments?limit=100`);
      setEnrollments(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setEnrollmentLoading(false);
    }
  }

  // --- SYLLABUS MANAGEMENT ACTIONS ---
  function openSyllabus(batch) {
    setSelectedSyllabusBatch(batch);
    setSyllabusAssignments(batch.weeklyAssignments || []);
    setNewAssignmentForm({ week: 1, title: "", description: "", submissionType: "individual" });
    setShowSyllabusModal(true);
  }

  function handleAddAssignment(e) {
    e.preventDefault();
    if (!newAssignmentForm.title) return;
    const newItem = {
      _id: "temp_" + Date.now(),
      week: parseInt(newAssignmentForm.week),
      title: newAssignmentForm.title,
      description: newAssignmentForm.description,
      submissionType: newAssignmentForm.submissionType || "individual"
    };
    setSyllabusAssignments(prev => [...prev, newItem].sort((a, b) => a.week - b.week));
    setNewAssignmentForm({ week: parseInt(newAssignmentForm.week) + 1, title: "", description: "", submissionType: "individual" });
  }

  function handleDeleteAssignment(id) {
    setSyllabusAssignments(prev => prev.filter(a => a._id !== id));
  }

  async function handleSaveSyllabus(e) {
    e.preventDefault();
    setSavingSyllabus(true);
    try {
      const cleaned = syllabusAssignments.map((a, index) => ({
        _id: a._id.startsWith("temp_") ? (1000 + index).toString() : a._id,
        week: a.week,
        title: a.title,
        description: a.description,
        submissionType: a.submissionType || "individual"
      }));

      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedSyllabusBatch._id}/assignments`, {
        method: "PUT",
        body: JSON.stringify({ assignments: cleaned })
      });

      alert("Syllabus updated successfully!");
      setShowSyllabusModal(false);
      loadTabDetails();
    } catch (err) {
      alert("Failed to save syllabus: " + err.message);
    } finally {
      setSavingSyllabus(false);
    }
  }

  // --- STAFF MANAGEMENT ACTIONS ---
  async function openStaffModal(batch) {
    setSelectedStaffBatch(batch);
    setAssignForm({ uid: "", role: "mentor" });
    setShowStaffModal(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batch._id}/staff`);
      setAssignedStaff(res.staff || []);
    } catch (err) {
      console.error("Failed to load staff list:", err);
    }
  }

  async function handleAssignStaff(e) {
    e.preventDefault();
    if (!assignForm.uid) return;
    setSavingStaff(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedStaffBatch._id}/staff`, {
        method: "POST",
        body: JSON.stringify({ uid: assignForm.uid, role: assignForm.role })
      });
      alert("Staff member assigned successfully!");
      
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedStaffBatch._id}/staff`);
      setAssignedStaff(res.staff || []);
      setAssignForm(prev => ({ ...prev, uid: "" }));
    } catch (err) {
      alert("Failed to assign staff: " + err.message);
    } finally {
      setSavingStaff(false);
    }
  }

  async function handleUnassignStaff(uid) {
    triggerConfirm(
      "Unassign Staff Member",
      "Are you sure you want to unassign this staff member from this batch?",
      async () => {
        try {
          await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedStaffBatch._id}/staff/${uid}`, {
            method: "DELETE"
          });
          alert("Staff member unassigned successfully!");
          
          const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedStaffBatch._id}/staff`);
          setAssignedStaff(res.staff || []);
        } catch (err) {
          alert("Failed to unassign staff: " + err.message);
        }
      }
    );
  }

  async function handleEnrollStudent(e) {
    e.preventDefault();
    if (!enrollEmail) return;
    try {
      // 1. Fetch organization members to resolve the email to a UID
      const membersData = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/members?limit=200`);
      const allMembers = membersData.data || membersData.members || [];
      const targetMember = allMembers.find(m => m.email?.toLowerCase() === enrollEmail.toLowerCase());

      if (!targetMember || !targetMember.uid) {
        // Fallback to legacy endpoint to handle placeholder registration or auto-linking
        await authenticatedFetch(`/admin/add-student-to-batch`, {
          method: 'POST',
          body: JSON.stringify({
            email: enrollEmail,
            batchId: selectedBatch._id
          })
        });
        alert("Student registry placeholder created and enrolled!");
        setEnrollEmail("");
        viewEnrollments(selectedBatch);
        return;
      }

      // 2. Enroll student in the batch using their resolved UID
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedBatch._id}/enrollments`, {
        method: "POST",
        body: JSON.stringify({
          uid: targetMember.uid,
          status: "active"
        })
      });
      
      alert("Student enrolled successfully!");
      setEnrollEmail("");
      viewEnrollments(selectedBatch);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUpdateEnrollment(uid, status) {
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedBatch._id}/enrollments/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      alert("Enrollment status updated!");
      viewEnrollments(selectedBatch);
    } catch (err) {
      alert(err.message);
    }
  }

  // --- JOB PIPELINE ACTIONS ---
  async function handleSaveJob(e) {
    e.preventDefault();
    try {
      const path = editingJob
        ? `/api/v2/organizations/${activeOrg._id}/jobs/${editingJob._id}`
        : `/api/v2/organizations/${activeOrg._id}/jobs`;
      const method = editingJob ? "PUT" : "POST";

      await authenticatedFetch(path, {
        method,
        body: JSON.stringify(jobFormData)
      });

      alert("Job saved successfully!");
      setShowJobModal(false);
      setEditingJob(null);
      loadTabDetails();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleJobAction(jobId, action) {
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/jobs/${jobId}/${action}`, {
        method: "POST"
      });
      alert(`Job ${action}ed successfully!`);
      loadTabDetails();
    } catch (err) {
      alert(err.message);
    }
  }

  async function viewJobApplications(job) {
    setSelectedJob(job);
    setShowCandidatesModal(true);
    try {
      const data = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/jobs/${job._id}/applications`);
      setCandidates(data.applications || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdateApplicationStatus(applicationId, status) {
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/jobs/${selectedJob._id}/applications/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      alert("Candidate status updated!");
      viewJobApplications(selectedJob);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="bg-white/40 border border-white/50 rounded-3xl overflow-hidden shadow-glass backdrop-blur-md flex flex-col md:flex-row min-h-[600px] animate-fadeIn">
      {/* Sidebar Sub-menus */}
      <aside className="w-full md:w-60 bg-white/50 border-r border-gray-150 p-6 flex flex-row md:flex-col gap-2 md:gap-4 overflow-x-auto md:overflow-x-visible">
        <button onClick={() => setActiveTab("overview")} className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold flex items-center transition cursor-pointer ${activeTab === "overview" ? "bg-blue-50 text-blue-700 font-bold border border-blue-105" : "text-gray-555 hover:text-gray-800 hover:bg-gray-50/50"}`}>
          <Layers className="w-4 h-4 mr-2" /> Overview
        </button>
        <button onClick={() => setActiveTab("batches")} className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold flex items-center transition cursor-pointer ${activeTab === "batches" ? "bg-blue-50 text-blue-700 font-bold border border-blue-105" : "text-gray-555 hover:text-gray-800 hover:bg-gray-50/50"}`}>
          <Layers className="w-4 h-4 mr-2" /> Cohorts / Batches
        </button>
        <button onClick={() => setActiveTab("members")} className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold flex items-center transition cursor-pointer ${activeTab === "members" ? "bg-blue-50 text-blue-700 font-bold border border-blue-105" : "text-gray-555 hover:text-gray-800 hover:bg-gray-50/50"}`}>
          <Users className="w-4 h-4 mr-2" /> Team Members
        </button>
        <button onClick={() => setActiveTab("compliance")} className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold flex items-center transition cursor-pointer ${activeTab === "compliance" ? "bg-blue-50 text-blue-700 font-bold border border-blue-105" : "text-gray-555 hover:text-gray-800 hover:bg-gray-50/50"}`}>
          <Shield className="w-4 h-4 mr-2" /> Scoped Audits
        </button>
        <button onClick={() => setActiveTab("jobs")} className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold flex items-center transition cursor-pointer ${activeTab === "jobs" ? "bg-blue-50 text-blue-700 font-bold border border-blue-105" : "text-gray-555 hover:text-gray-800 hover:bg-gray-50/50"}`}>
          <Briefcase className="w-4 h-4 mr-2" /> Jobs Board
        </button>
        <button onClick={() => setActiveTab("branding")} className={`py-2.5 px-4 rounded-xl text-left text-sm font-semibold flex items-center transition cursor-pointer ${activeTab === "branding" ? "bg-blue-50 text-blue-700 font-bold border border-blue-105" : "text-gray-555 hover:text-gray-800 hover:bg-gray-50/50"}`}>
          <Settings className="w-4 h-4 mr-2" /> Branding Settings
        </button>
      </aside>

      {/* Detail Area */}
      <main className="flex-1 p-6 md:p-8 bg-white/20 text-gray-900 text-left">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
        ) : (
          <>
            {/* OVERVIEW SECTION */}
            {activeTab === "overview" && dashboardData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/60 p-5 rounded-2xl border border-white/60 shadow-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Memberships</span>
                    <h3 className="text-3xl font-extrabold text-gray-950 mt-1">{dashboardData.summary.activeMemberships}</h3>
                  </div>
                  <div className="bg-white/60 p-5 rounded-2xl border border-white/60 shadow-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pending Submissions</span>
                    <h3 className="text-3xl font-extrabold text-yellow-750 mt-1">{dashboardData.summary.submissionsPendingReview}</h3>
                  </div>
                  <div className="bg-white/60 p-5 rounded-2xl border border-white/60 shadow-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Batches</span>
                    <h3 className="text-3xl font-extrabold text-blue-650 mt-1">{dashboardData.summary.activeBatches}</h3>
                  </div>
                  <div className="bg-white/60 p-5 rounded-2xl border border-white/60 shadow-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Paid</span>
                    <h3 className="text-3xl font-extrabold text-green-700 mt-1">₹{dashboardData.summary.capturedPayments / 100}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Recent Activity stream */}
                  <div className="bg-white/60 rounded-2xl border border-white/60 p-6 flex flex-col shadow-xs">
                    <h3 className="text-base font-bold text-gray-950 mb-4">Organizational Audit Logs</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {dashboardData.recentActivity.map((act, index) => (
                        <div key={index} className="p-3 bg-white/80 border border-gray-150 rounded-xl flex flex-col space-y-1 shadow-2xs">
                          <span className="text-[9px] font-mono font-bold text-blue-700 uppercase">{act.type}</span>
                          <span className="text-xs text-gray-805 font-bold">{act.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Program Completion rates */}
                  <div className="bg-white/60 rounded-2xl border border-white/60 p-6 space-y-4 shadow-xs">
                    <h3 className="text-base font-bold text-gray-955">Program Performance</h3>
                    <div className="p-4 bg-white/80 border border-gray-150 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-500">Total Enrolled students:</span>
                        <span className="text-gray-950 font-bold">{dashboardData.summary.completionMetrics?.activeEnrollments || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-500">Graduates/Certified:</span>
                        <span className="text-gray-950 font-bold">{dashboardData.summary.completionMetrics?.completedEnrollments || 0}</span>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
                          <span>Completion/Graduation Rate</span>
                          <span>{dashboardData.summary.completionMetrics?.completionRate || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: `${dashboardData.summary.completionMetrics?.completionRate || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BATCHES MANAGEMENT */}
            {activeTab === "batches" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-955">Cohort Programs</h3>
                  <button onClick={() => { 
                    setEditingBatch(null); 
                    setBatchFormData({ batchCode: "", title: "", domain: "", startDate: "", certificateFee: 0, googleFormLink: "", status: "draft" }); 
                    setShowBatchModal(true); 
                  }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center transition shadow-md cursor-pointer">
                    <Plus className="w-4 h-4 mr-1.5" /> Create Program
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {batches.map(batch => (
                    <div key={batch._id} className="bg-white/60 p-6 rounded-2xl border border-white/60 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-extrabold text-gray-950">{batch.name || batch.title}</h4>
                            <span className="text-xs font-mono text-gray-400">{batch.batchCode}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${batch.status === "active" || batch.isActive ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-500 border border-gray-150"}`}>
                            {(batch.status || (batch.isActive ? "active" : "archived")).toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-gray-600 font-semibold">
                          <p>Domain: <strong className="text-gray-800">{batch.domain || "Not set"}</strong></p>
                          <p>Certificate Fee: <strong className="text-gray-800">₹{batch.certificateFee}</strong></p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-150 flex justify-between items-center flex-wrap gap-2">
                        <div className="flex space-x-2">
                          <button onClick={() => viewEnrollments(batch)} className="text-xs font-bold text-blue-700 hover:text-blue-655 flex items-center bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg cursor-pointer">
                            <Users className="w-3.5 h-3.5 mr-1.5" /> View & Enroll
                          </button>
                          <button onClick={() => openSyllabus(batch)} className="text-xs font-bold text-indigo-750 hover:text-indigo-650 flex items-center bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg cursor-pointer">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Manage Syllabus
                          </button>
                          <button onClick={() => openStaffModal(batch)} className="text-xs font-bold text-teal-750 hover:text-teal-650 flex items-center bg-teal-50 border border-teal-100 px-2.5 py-1.5 rounded-lg cursor-pointer">
                            <Users className="w-3.5 h-3.5 mr-1.5" /> Manage Staff
                          </button>
                        </div>
                        <div className="flex space-x-1">
                          <button onClick={() => {
                            setEditingBatch(batch);
                            setBatchFormData({
                              batchCode: batch.batchCode,
                              title: batch.name || batch.title,
                              domain: batch.domain || "",
                              startDate: batch.startDate ? batch.startDate.split("T")[0] : "",
                              certificateFee: batch.certificateFee,
                              googleFormLink: batch.googleFormLink || "",
                              status: batch.status || "draft"
                            });
                            setShowBatchModal(true);
                          }} className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer"><Edit className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MEMBERS MANAGEMENT */}
            {activeTab === "members" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-955">Members Registry</h3>
                  <button onClick={() => setShowMemberModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center transition shadow-md cursor-pointer">
                    <UserPlus className="w-4 h-4 mr-1.5" /> Invite Member
                  </button>
                </div>

                <div className="bg-white/60 rounded-2xl border border-white/60 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-500 bg-gray-50/50 uppercase tracking-wider">
                          <th className="p-4">Name/UID</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-xs">
                        {members.map(member => (
                          <tr key={member._id} className="hover:bg-gray-50/30">
                            <td className="p-4">
                              <span className="font-bold text-gray-950">{member.displayName || "Invited User"}</span>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{member.uid}</p>
                            </td>
                            <td className="p-4">
                              <select value={member.role} onChange={(e) => handleUpdateMember(member.uid, member.status, e.target.value)} className="bg-white border border-gray-250 rounded p-1 text-xs text-gray-900 font-mono outline-none">
                                <option value="student">student</option>
                                <option value="mentor">mentor</option>
                                <option value="evaluator">evaluator</option>
                                <option value="org_admin">org_admin</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full font-mono uppercase ${member.status === "active" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-650 border border-red-100"}`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              {member.status === "active" ? (
                                <button onClick={() => handleUpdateMember(member.uid, "suspended", member.role)} className="text-xs text-red-650 hover:text-red-700 font-semibold px-2 py-1 bg-red-50 border border-red-100 rounded cursor-pointer">
                                  Suspend
                                </button>
                              ) : (
                                <button onClick={() => handleUpdateMember(member.uid, "active", member.role)} className="text-xs text-green-700 hover:text-green-650 font-semibold px-2 py-1 bg-green-50 border border-green-100 rounded cursor-pointer">
                                  Restore
                                </button>
                              )}
                              <button onClick={() => handleRemoveMember(member.uid)} className="text-gray-400 hover:text-red-650 transition p-1 inline-flex items-center cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* COMPLIANCE LOGS SECTION */}
            {activeTab === "compliance" && (
              <div className="space-y-6">
                {/* Audit filters */}
                <div className="bg-white/60 p-6 rounded-2xl border border-white/60 shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Filter Action</label>
                      <input type="text" placeholder="e.g. UPDATE_MEMBER" value={auditFilters.action} onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Severity</label>
                      <select value={auditFilters.severity} onChange={(e) => setAuditFilters(prev => ({ ...prev, severity: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105">
                        <option value="">All</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => fetchComplianceAudits(1)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition cursor-pointer shadow-xs">
                      Filter Logs
                    </button>
                    <button onClick={exportOrgAuditsToCSV} className="bg-white hover:bg-gray-50 border border-gray-250 text-gray-800 font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center cursor-pointer shadow-xs">
                      <Download className="w-4 h-4 mr-1" /> Export CSV
                    </button>
                  </div>
                </div>

                {/* Audit Grid */}
                <div className="bg-white/60 p-6 rounded-2xl border border-white/60 shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          <th className="pb-3">Timestamp</th>
                          <th className="pb-3">Action</th>
                          <th className="pb-3">Actor</th>
                          <th className="pb-3">Severity</th>
                          <th className="pb-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-xs">
                        {auditLogs.map(log => (
                          <Fragment key={log._id}>
                            <tr className="hover:bg-gray-50/30">
                              <td className="py-3 text-xs text-gray-400 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                              <td className="py-3 font-mono font-bold text-gray-800">{log.action}</td>
                              <td className="py-3 text-xs text-gray-500 font-mono">{log.actorUid}</td>
                              <td className="py-3">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full font-mono uppercase ${log.severity === "CRITICAL" ? "bg-red-50 text-red-655 border border-red-100" : "bg-blue-50 text-blue-650 border border-blue-100"}`}>
                                  {log.severity || "INFO"}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)} className="text-xs text-blue-700 hover:text-blue-650 font-semibold px-2 py-1 bg-blue-50 border border-blue-100 rounded cursor-pointer">
                                  {expandedLogId === log._id ? "Collapse" : "Expand"}
                                </button>
                              </td>
                            </tr>
                            {expandedLogId === log._id && (
                              <tr className="bg-gray-50/50">
                                <td colSpan={5} className="p-4 border-b border-gray-150">
                                  <div className="text-[10px] text-gray-700 font-mono whitespace-pre-wrap text-left bg-white p-3 rounded-lg border border-gray-150 shadow-xs max-w-full overflow-x-auto">
                                    {JSON.stringify(log.metadata || {}, null, 2)}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center border-t border-gray-150 pt-4 text-xs text-gray-500 mt-4">
                    <span>Page <strong>{auditPage}</strong> of <strong>{auditTotalPages}</strong></span>
                    <div className="flex space-x-2">
                      <button disabled={auditPage === 1} onClick={() => fetchComplianceAudits(auditPage - 1)} className="p-1.5 bg-white border border-gray-250 rounded hover:bg-gray-50 transition disabled:opacity-30 cursor-pointer">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button disabled={auditPage === auditTotalPages} onClick={() => fetchComplianceAudits(auditPage + 1)} className="p-1.5 bg-white border border-gray-250 rounded hover:bg-gray-50 transition disabled:opacity-30 cursor-pointer">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* JOBS BOARD SECTION */}
            {activeTab === "jobs" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-955 font-mono">Job Openings</h3>
                  <button onClick={() => { setEditingJob(null); setShowJobModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center transition shadow-md cursor-pointer">
                    <Plus className="w-4 h-4 mr-1.5" /> Post Job
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobs.map(job => (
                    <div key={job._id} className="bg-white/60 p-6 rounded-2xl border border-white/60 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-extrabold text-gray-950">{job.title}</h4>
                            <p className="text-xs text-gray-500 font-semibold">{job.department} • {job.location}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono uppercase ${job.status === "published" ? "bg-green-50 text-green-700 border border-green-100" : job.status === "closed" ? "bg-red-50 text-red-650 border border-red-100" : "bg-gray-50 text-gray-500 border border-gray-150"}`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-gray-600 line-clamp-2 leading-relaxed">{job.description}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-150 flex justify-between items-center">
                        <button onClick={() => viewJobApplications(job)} className="text-xs font-bold text-blue-700 hover:text-blue-650 flex items-center bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg cursor-pointer">
                          Pipeline Applications
                        </button>
                        <div className="flex space-x-2 text-xs">
                          {job.status === "draft" && (
                            <button onClick={() => handleJobAction(job._id, "publish")} className="text-green-700 font-bold hover:underline cursor-pointer">Publish</button>
                          )}
                          {job.status === "published" && (
                            <button onClick={() => handleJobAction(job._id, "close")} className="text-red-650 font-bold hover:underline cursor-pointer">Close</button>
                          )}
                          {job.status === "closed" && (
                            <button onClick={() => handleJobAction(job._id, "archive")} className="text-gray-500 font-bold hover:underline cursor-pointer">Archive</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BRANDING CONFIG EDITOR */}
            {activeTab === "branding" && (
              <form onSubmit={handleSaveBranding} className="space-y-6 max-w-xl bg-white/60 p-6 rounded-2xl border border-white/60 shadow-xs text-left">
                <h3 className="text-lg font-bold text-gray-955 mb-4">Edit Branding Configurations</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Branding Custom Logo URL</label>
                  <input type="url" required value={brandingForm.logoUrl} onChange={(e) => setBrandingForm(prev => ({ ...prev, logoUrl: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Primary Palette Theme (HEX)</label>
                  <div className="flex gap-3">
                    <input type="color" value={brandingForm.primaryColor} onChange={(e) => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))} className="w-12 h-10 bg-transparent border-0 cursor-pointer" />
                    <input type="text" pattern="^#[0-9A-Fa-f]{6}$" required value={brandingForm.primaryColor} onChange={(e) => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))} className="flex-1 p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-blue-105" placeholder="#2563eb" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Website Address</label>
                  <input type="url" value={brandingForm.website} onChange={(e) => setBrandingForm(prev => ({ ...prev, website: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Public Contact Email</label>
                  <input type="email" required value={brandingForm.contactEmail} onChange={(e) => setBrandingForm(prev => ({ ...prev, contactEmail: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="contact@org.com" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Public Phone Number</label>
                  <input type="text" value={brandingForm.contactPhone} onChange={(e) => setBrandingForm(prev => ({ ...prev, contactPhone: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="+91..." />
                </div>

                <button disabled={savingBranding} className="w-full p-3 bg-blue-600 hover:bg-blue-505 text-white font-bold rounded-lg text-sm transition cursor-pointer shadow-md">
                  {savingBranding ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Save Settings"}
                </button>
              </form>
            )}
          </>
        )}
      </main>

      {/* NEW BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md text-gray-900 border border-gray-250/50 shadow-glass backdrop-blur-md text-left">
            <h3 className="text-xl font-bold mb-4 text-gray-950">{editingBatch ? "Edit Cohort" : "Create Cohort Program"}</h3>
            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cohort Code</label>
                <input required value={batchFormData.batchCode} onChange={(e) => setBatchFormData(prev => ({ ...prev, batchCode: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="e.g. FS-001" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cohort Title</label>
                <input required value={batchFormData.title} onChange={(e) => setBatchFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="Full Stack Internship" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Domain Area</label>
                <input required value={batchFormData.domain} onChange={(e) => setBatchFormData(prev => ({ ...prev, domain: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="Full Stack" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input type="date" required value={batchFormData.startDate} onChange={(e) => setBatchFormData(prev => ({ ...prev, startDate: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Certification Price (₹)</label>
                <input type="number" required value={batchFormData.certificateFee} onChange={(e) => setBatchFormData(prev => ({ ...prev, certificateFee: parseInt(e.target.value) }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Registration Link</label>
                <input type="url" required value={batchFormData.googleFormLink} onChange={(e) => setBatchFormData(prev => ({ ...prev, googleFormLink: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="https://..." />
              </div>
              {editingBatch && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select value={batchFormData.status} onChange={(e) => setBatchFormData(prev => ({ ...prev, status: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105 font-semibold">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowBatchModal(false)} className="px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition cursor-pointer">Cancel</button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md text-gray-900 border border-gray-250/50 shadow-glass backdrop-blur-md text-left">
            <h3 className="text-xl font-bold mb-4 text-gray-950">Invite Organizational Member</h3>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full p-2.5 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="collaborator@company.com" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assigned Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full p-2.5 bg-white border border-gray-250 rounded text-gray-900 outline-none font-semibold">
                  <option value="student">student</option>
                  <option value="mentor">mentor</option>
                  <option value="evaluator">evaluator</option>
                  <option value="org_admin">org_admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition cursor-pointer">Cancel</button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST JOB MODAL */}
      {showJobModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md text-gray-900 border border-gray-250/50 shadow-glass backdrop-blur-md text-left">
            <h3 className="text-xl font-bold mb-4 text-gray-950">{editingJob ? "Edit Job opening" : "Post Job Opening"}</h3>
            <form onSubmit={handleSaveJob} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Job Title</label>
                <input required value={jobFormData.title} onChange={(e) => setJobFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="Software Engineer" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Department</label>
                <input required value={jobFormData.department} onChange={(e) => setJobFormData(prev => ({ ...prev, department: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="Engineering" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Location</label>
                <input required value={jobFormData.location} onChange={(e) => setJobFormData(prev => ({ ...prev, location: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="Bengaluru, India" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Job Type</label>
                <select value={jobFormData.jobType} onChange={(e) => setJobFormData(prev => ({ ...prev, jobType: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 font-semibold outline-none">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea value={jobFormData.description} onChange={(e) => setJobFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none h-20 focus:ring-2 focus:ring-blue-105" placeholder="Job description..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Application URL</label>
                <input type="url" required value={jobFormData.googleFormLink} onChange={(e) => setJobFormData(prev => ({ ...prev, googleFormLink: e.target.value }))} className="w-full p-2 bg-white border border-gray-250 rounded text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="https://..." />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowJobModal(false)} className="px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition cursor-pointer">Cancel</button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer">Save Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW & ENROLL STUDENTS MODAL */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-250/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-glass backdrop-blur-md text-gray-900 text-left overflow-hidden">
            <div className="bg-gray-50 p-6 flex justify-between items-center border-b border-gray-150">
              <div>
                <h3 className="text-xl font-extrabold text-gray-950">{selectedBatch?.name || selectedBatch?.title}</h3>
                <p className="text-xs text-gray-500 font-semibold">Enrollment & Student Registry</p>
              </div>
              <button onClick={() => setShowEnrollmentModal(false)} className="text-gray-400 hover:text-gray-800 cursor-pointer"><X className="w-6 h-6" /></button>
            </div>

            {/* Quick enroll form */}
            <div className="p-6 bg-white border-b border-gray-150">
              <form onSubmit={handleEnrollStudent} className="flex gap-3">
                <input type="email" required placeholder="student@gmail.com" value={enrollEmail} onChange={(e) => setEnrollEmail(e.target.value)} className="flex-1 p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" />
                <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition cursor-pointer shadow-xs">
                  Enroll Student
                </button>
              </form>
              <p className="text-[10px] text-gray-400 mt-2 font-semibold">* Input the registered email of the student to bind them to this program.</p>
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto p-6">
              {enrollmentLoading ? (
                <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : enrollments.length === 0 ? (
                <p className="text-center text-gray-400 mt-10 font-semibold">No students enrolled in this program yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="pb-3">Name / UID</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {enrollments.map(en => (
                        <tr key={en._id} className="hover:bg-gray-55/30">
                          <td className="py-3">
                            <span className="font-bold text-gray-955">{en.displayName || "Enrolled Candidate"}</span>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{en.email || en.uid}</p>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full font-mono uppercase ${en.status === "completed" ? "bg-green-55 text-green-700 border border-green-100" : en.status === "active" ? "bg-blue-50 text-blue-650 border border-blue-100" : "bg-gray-50 text-gray-550 border border-gray-150"}`}>
                              {en.status}
                            </span>
                          </td>
                          <td className="py-3 text-right space-x-1.5">
                            {en.status === "active" && (
                              <button onClick={() => handleUpdateEnrollment(en.uid, "completed")} className="text-xs text-green-700 hover:text-green-650 font-semibold px-2 py-1 bg-green-50 border border-green-100 rounded cursor-pointer">
                                Certify
                              </button>
                            )}
                            {(en.status === "active" || en.status === "suspended") && (
                              <button onClick={() => handleUpdateEnrollment(en.uid, "dropped")} className="text-xs text-red-650 hover:text-red-700 font-semibold px-2 py-1 bg-red-50 border border-red-100 rounded cursor-pointer">
                                Drop
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        {/* JOB APPLICATIONS CANDIDATES MODAL */}
      {showCandidatesModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-250/50 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-glass backdrop-blur-md text-gray-900 text-left">
            <div className="bg-gray-55 p-6 flex justify-between items-center border-b border-gray-150">
              <div>
                <h3 className="text-xl font-extrabold text-gray-955">{selectedJob?.title} Applications</h3>
                <p className="text-xs text-gray-500 font-semibold">Applications Candidate Pipeline</p>
              </div>
              <button onClick={() => setShowCandidatesModal(false)} className="text-gray-400 hover:text-gray-850 cursor-pointer"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {candidates.length === 0 ? (
                <p className="text-center text-gray-400 mt-10 font-semibold">No candidates have applied to this opening yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-550 uppercase tracking-wider">
                        <th className="pb-3">Candidate ID</th>
                        <th className="pb-3">Applied At</th>
                        <th className="pb-3">Current Status</th>
                        <th className="pb-3 text-right">Advance Pipeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {candidates.map(cand => (
                        <tr key={cand._id} className="hover:bg-gray-55/30">
                          <td className="py-3 font-mono text-gray-650">{cand.uid}</td>
                          <td className="py-3 text-xs text-gray-400 font-mono">{new Date(cand.appliedAt).toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full font-mono uppercase ${cand.status === "selected" ? "bg-green-50 text-green-700 border border-green-100" : cand.status === "rejected" ? "bg-red-50 text-red-650 border border-red-100" : "bg-blue-50 text-blue-650 border border-blue-100"}`}>
                              {cand.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <select value={cand.status} onChange={(e) => handleUpdateApplicationStatus(cand._id, e.target.value)} className="bg-white border border-gray-250 rounded p-1 text-xs text-gray-900 outline-none font-semibold">
                              <option value="applied">Applied</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="interview_scheduled">Interview</option>
                              <option value="selected">Select</option>
                              <option value="rejected">Reject</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE SYLLABUS MODAL */}
      {showSyllabusModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-gray-250/50 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-glass backdrop-blur-md text-gray-900 text-left overflow-hidden">
            <div className="bg-gray-55 p-6 flex justify-between items-center border-b border-gray-150">
              <div>
                <h3 className="text-xl font-extrabold text-gray-955">Manage Syllabus - {selectedSyllabusBatch?.name || selectedSyllabusBatch?.title}</h3>
                <p className="text-xs text-gray-500 font-semibold">Configure week-by-week assignments for this program cohort</p>
              </div>
              <button onClick={() => setShowSyllabusModal(false)} className="text-gray-400 hover:text-gray-850 cursor-pointer"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-150">
              {/* Left Column: Current weekly syllabus checklist */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col min-w-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Syllabus Curriculum Checklist</h4>
                {syllabusAssignments.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-450">
                    <FileText className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-xs font-bold">No assignments have been added to this cohort syllabus yet.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Use the entry form on the right to populate the curriculum.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syllabusAssignments.map((assign, index) => (
                      <div key={assign._id} className="p-4 bg-gray-55 border border-gray-150 rounded-xl flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-block bg-blue-50 text-blue-755 text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase">Week {assign.week}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSyllabusAssignments(prev => prev.map(a => 
                                  a._id === assign._id 
                                    ? { ...a, submissionType: a.submissionType === "group" ? "individual" : "group" }
                                    : a
                                ));
                              }}
                              className={`inline-block text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase cursor-pointer hover:opacity-80 transition ${assign.submissionType === "group" ? "bg-purple-50 text-purple-755" : "bg-gray-50 text-gray-550"}`}
                              title="Click to toggle submission mode"
                            >
                              {assign.submissionType === "group" ? "Group" : "Individual"}
                            </button>
                          </div>
                          <h5 className="text-sm font-bold text-gray-955 mt-1.5 truncate">{assign.title}</h5>
                          <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{assign.description || "No description provided."}</p>
                        </div>
                        <button type="button" onClick={() => handleDeleteAssignment(assign._id)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Add assignment form */}
              <div className="w-full md:w-80 p-6 bg-gray-50/50 flex flex-col overflow-y-auto shrink-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Add Weekly Assignment</h4>
                <form onSubmit={handleAddAssignment} className="space-y-4 flex-1">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Week Number</label>
                    <input type="number" min="1" required value={newAssignmentForm.week} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, week: parseInt(e.target.value) || 1 }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assignment Title</label>
                    <input type="text" required placeholder="e.g. Build Web Portfolio" value={newAssignmentForm.title} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, title: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Details & Requirements</label>
                    <textarea placeholder="List details, links, or expectations..." value={newAssignmentForm.description} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, description: e.target.value }))} className="w-full flex-1 p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105 resize-none min-h-[100px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Submission Mode</label>
                    <select value={newAssignmentForm.submissionType || "individual"} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, submissionType: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-950 outline-none focus:ring-2 focus:ring-blue-105">
                      <option value="individual">Individual Project</option>
                      <option value="group">Group Collaboration</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-gray-950 hover:bg-gray-850 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm">
                    Add Assignment
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-gray-55 p-4 flex justify-end space-x-3 border-t border-gray-150">
              <button type="button" onClick={() => setShowSyllabusModal(false)} className="px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition cursor-pointer text-xs font-bold">
                Cancel
              </button>
              <button disabled={savingSyllabus} onClick={handleSaveSyllabus} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition shadow-md cursor-pointer text-xs flex items-center">
                {savingSyllabus ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Save Syllabus"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MANAGE STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-gray-250/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-glass backdrop-blur-md text-gray-900 text-left overflow-hidden">
            <div className="bg-gray-55 p-6 flex justify-between items-center border-b border-gray-150">
              <div>
                <h3 className="text-xl font-extrabold text-gray-955">Manage Staffing - {selectedStaffBatch?.name || selectedStaffBatch?.title}</h3>
                <p className="text-xs text-gray-500 font-semibold">Assign mentors and evaluators to guide this cohort</p>
              </div>
              <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-gray-850 cursor-pointer"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-150">
              {/* Left Column: Current staff assignments */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col min-w-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Assigned Staff Members</h4>
                {assignedStaff.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-450">
                    <Users className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-xs font-bold">No staff members have been assigned to this cohort yet.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Use the assignment form on the right to assign mentors/evaluators.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignedStaff.map((assign) => (
                      <div key={assign._id} className="p-4 bg-gray-55 border border-gray-150 rounded-xl flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className={`inline-block text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${assign.role === "mentor" ? "bg-teal-50 text-teal-750" : "bg-purple-50 text-purple-750"}`}>{assign.role}</span>
                          <h5 className="text-sm font-bold text-gray-955 mt-1.5 truncate">{assign.user?.displayName || "Unknown User"}</h5>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{assign.user?.email || assign.uid}</p>
                        </div>
                        <button type="button" onClick={() => handleUnassignStaff(assign.uid)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Add staff form */}
              <div className="w-full md:w-80 p-6 bg-gray-50/50 flex flex-col overflow-y-auto shrink-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Assign Staff</h4>
                <form onSubmit={handleAssignStaff} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Staff Member</label>
                    <select required value={assignForm.uid} onChange={(e) => setAssignForm(prev => ({ ...prev, uid: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105">
                      <option value="">-- Select Member --</option>
                      {members.filter(m => (m.role === "mentor" || m.role === "evaluator") && m.status === "active").map(m => (
                        <option key={m.uid} value={m.uid}>
                          {m.displayName || "Unknown User"} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Batch Role</label>
                    <select required value={assignForm.role} onChange={(e) => setAssignForm(prev => ({ ...prev, role: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105">
                      <option value="mentor">Mentor</option>
                      <option value="evaluator">Evaluator</option>
                    </select>
                  </div>
                  <button type="submit" disabled={savingStaff} className="w-full py-2.5 bg-gray-950 hover:bg-gray-850 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm flex justify-center items-center">
                    {savingStaff ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Assign Staff"}
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-gray-55 p-4 flex justify-end space-x-3 border-t border-gray-150">
              <button type="button" onClick={() => setShowStaffModal(false)} className="px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition cursor-pointer text-xs font-bold">
                Close
              </button>
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
