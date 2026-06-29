import { useEffect, useState, useRef } from "react";
import { authenticatedFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import {
  Loader2, Lock, CheckCircle, Clock, FileText, ShieldCheck, Users,
  CreditCard, Briefcase, RefreshCw, Send, HelpCircle, AlertCircle, Layers, XCircle, Info
} from "lucide-react";

export default function StudentDashboardView() {
  const { currentUser, refreshProfile } = useAuth();
  const { activeOrg } = useTenant();

  const [activeSubTab, setActiveSubTab] = useState("coursework");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  // Coursework states
  const [assignmentsData, setAssignmentsData] = useState(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittingUrl, setSubmittingUrl] = useState("");
  const [submittingComments, setSubmittingComments] = useState("");
  const [submittingProgress, setSubmittingProgress] = useState(false);

  // Group states
  const [group, setGroup] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCodeInput, setGroupCodeInput] = useState("");
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupChatInput, setGroupChatInput] = useState("");
  const [sendingGroupMsg, setSendingGroupMsg] = useState(false);
  const [registeringRepo, setRegisteringRepo] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [activeCohortGroups, setActiveCohortGroups] = useState([]);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  // Jobs states
  const [jobsList, setJobsList] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Billing states
  const [billingHistory, setBillingHistory] = useState([]);
  const [myCertificates, setMyCertificates] = useState([]);
  const [claimingCert, setClaimingCert] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [pendingJoinRequest, setPendingJoinRequest] = useState(null);

  // Support / Help-desk states
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketArticles, setTicketArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: "", category: "General", body: "" });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [supportAlert, setSupportAlert] = useState({ isOpen: false, title: "", message: "" });
  const triggerSupportAlert = (title, message) => setSupportAlert({ isOpen: true, title, message });
  const [ticketContext, setTicketContext] = useState({ batchId: "", assignmentId: "", submissionId: "" });

  const chatEndRef = useRef(null);
  const ticketEndRef = useRef(null);

  useEffect(() => {
    if (!activeOrg) return;
    loadStudentDashboard();
  }, [activeOrg, selectedBatchId]);

  async function fetchPendingJoinRequest() {
    if (!analytics?.summary?.certificateEligibility?.batchId) return;
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/join-requests/me`);
      setPendingJoinRequest(res.request || null);
    } catch (e) {
      console.error("Failed to fetch pending join request:", e);
    }
  }

  useEffect(() => {
    if (activeSubTab === "coursework" && analytics?.summary?.certificateEligibility?.batchId) {
      fetchWeeklyAssignments();
    } else if (activeSubTab === "collaboration" && analytics?.summary?.certificateEligibility?.batchId) {
      fetchGroupDetails();
      fetchPendingJoinRequest();
    } else if (activeSubTab === "careers") {
      fetchJobOpenings();
    } else if (activeSubTab === "billing") {
      fetchBillingHistory();
    } else if (activeSubTab === "support") {
      fetchSupportTickets();
    }
  }, [activeSubTab, analytics]);

  useEffect(() => {
    ticketEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketArticles]);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  // Group Chat message polling
  useEffect(() => {
    if (activeSubTab !== "collaboration" || !group) return;
    const interval = setInterval(fetchGroupMessages, 5000);
    return () => clearInterval(interval);
  }, [activeSubTab, group]);

  async function loadStudentDashboard() {
    setLoading(true);
    try {
      const url = selectedBatchId
        ? `/api/v2/organizations/${activeOrg._id}/dashboard/student?forceReload=true&batchId=${selectedBatchId}`
        : `/api/v2/organizations/${activeOrg._id}/dashboard/student?forceReload=true`;
      const res = await authenticatedFetch(url);
      setAnalytics(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // --- COURSEWORK LOADER ---
  async function fetchWeeklyAssignments() {
    const { batchId } = analytics.summary.certificateEligibility;
    // We get domain from profile or fallback
    const domain = currentUser.domain || "Full Stack";
    setAssignmentsLoading(true);
    try {
      // Consume GET /assignments/:batchId/:domain (Legacy URL structure)
      const data = await authenticatedFetch(`/assignments/${batchId}/${encodeURIComponent(domain)}`);
      setAssignmentsData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAssignmentsLoading(false);
    }
  }

  async function handleSubmitAssignment(e) {
    e.preventDefault();
    if (!submittingUrl) return;
    setSubmittingProgress(true);
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      // Consume V2 submit route
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/assignments/${selectedAssignment._id}/submissions`, {
        method: "POST",
        body: JSON.stringify({
          fileUrl: submittingUrl,
          comments: submittingComments
        })
      });
      alert("Coursework submitted successfully!");
      setShowSubmitModal(false);
      setSubmittingUrl("");
      setSubmittingComments("");
      await refreshProfile();
      await loadStudentDashboard();
    } catch (err) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmittingProgress(false);
    }
  }

  // --- GROUP COLLABORATION ACTIONS ---
  async function fetchGroupDetails() {
    const { batchId } = analytics.summary.certificateEligibility;
    setGroupLoading(true);
    try {
      // Load groups in this batch
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups`);
      const groupsList = res.groups || [];

      // Filter active groups that this student is NOT a member of
      const activeGroups = groupsList.filter(g => g.status === 'active' && !g.members?.includes(currentUser.uid));
      setActiveCohortGroups(activeGroups);

      const myGroup = groupsList.find(g => g.members?.includes(currentUser.uid));
      
      if (myGroup) {
        // Fetch detailed group info
        const details = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${myGroup.groupCode}`);
        setGroup(details.group);
        setRepoUrlInput(details.group.repoUrl || "");
        if (details.group.status === 'active') {
          fetchGroupMessages(myGroup.groupCode);
        }
      } else {
        setGroup(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGroupLoading(false);
    }
  }

  async function handleDirectJoinGroup(code) {
    if (!code) return;
    setGroupLoading(true);
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${code}/join-request`, {
        method: "POST"
      });
      alert("Join request successfully submitted! Awaiting evaluator approval.");
      fetchPendingJoinRequest();
    } catch (e) {
      alert(e.message || "Failed to submit join request");
    } finally {
      setGroupLoading(false);
    }
  }

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

  async function handleCancelJoinRequest() {
    triggerConfirm(
      "Cancel Join Request",
      "Are you sure you want to cancel your pending join request?",
      async () => {
        setGroupLoading(true);
        const { batchId } = analytics.summary.certificateEligibility;
        try {
          await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/join-requests/me/cancel`, {
            method: "POST"
          });
          alert("Join request cancelled.");
          setPendingJoinRequest(null);
          fetchGroupDetails();
        } catch (e) {
          alert(e.message || "Failed to cancel request");
        } finally {
          setGroupLoading(false);
        }
      }
    );
  }


  async function fetchGroupMessages(code = null) {
    const groupCode = code || group?.groupCode;
    if (!groupCode) return;
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${groupCode}/messages`);
      setGroupMessages(res.messages || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!groupName) return;
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups`, {
        method: "POST",
        body: JSON.stringify({ name: groupName })
      });
      alert("Group team formed successfully!");
      setShowGroupCreate(false);
      setGroupName("");
      fetchGroupDetails();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleJoinGroup(e) {
    e.preventDefault();
    if (!groupCodeInput) return;
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${groupCodeInput}/join-request`, {
        method: "POST"
      });
      alert("Request submitted successfully! Awaiting evaluator approval.");
      setGroupCodeInput("");
      fetchPendingJoinRequest();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLeaveGroup() {
    setShowLeaveConfirmModal(true);
  }

  async function executeLeaveGroup() {
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${group.groupCode}/leave`, {
        method: "POST"
      });
      alert("Successfully left the group");
      setGroup(null);
      fetchGroupDetails();
      refreshProfile();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRegisterRepo(e) {
    e.preventDefault();
    if (!repoUrlInput) return;
    setRegisteringRepo(true);
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${group.groupCode}/repository`, {
        method: "PUT",
        body: JSON.stringify({ repoUrl: repoUrlInput })
      });
      alert("Repository registered successfully!");
      fetchGroupDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setRegisteringRepo(false);
    }
  }

  async function handleSendGroupMessage(e) {
    e.preventDefault();
    if (!groupChatInput.trim() || !group) return;
    setSendingGroupMsg(true);
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${group.groupCode}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: groupChatInput })
      });
      setGroupChatInput("");
      fetchGroupMessages();
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingGroupMsg(false);
    }
  }

  // --- JOBS DIRECTORY LOADER ---
  async function fetchJobOpenings() {
    setJobsLoading(true);
    try {
      const data = await authenticatedFetch("/api/v2/student/jobs");
      setJobsList(data.jobs || []);

      const apps = await authenticatedFetch("/api/v2/student/applications");
      setMyApplications(apps.applications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setJobsLoading(false);
    }
  }

  async function handleApplyJob(jobId) {
    try {
      await authenticatedFetch(`/api/v2/jobs/${jobId}/apply`, { method: "POST" });
      alert("Application sent successfully!");
      fetchJobOpenings();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleWithdrawJob(appId) {
    triggerConfirm(
      "Withdraw Application",
      "Are you sure you want to withdraw this job application?",
      async () => {
        try {
          await authenticatedFetch(`/api/v2/student/applications/${appId}/withdraw`, { method: "POST" });
          alert("Application withdrawn.");
          fetchJobOpenings();
        } catch (err) {
          alert(err.message);
        }
      }
    );
  }

  // --- BILLINGS & CERTS ACTIONS ---
  async function fetchBillingHistory() {
    try {
      const bills = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/payments/history`);
      setBillingHistory(bills.history || []);

      const certs = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/certificates/my`);
      setMyCertificates(certs.certificates || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handlePayCertificationFee() {
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      // 1. Create payment order
      const order = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/payments/order`, {
        method: "POST"
      });

      // 2. Load Razorpay options
      const options = {
        key: "rzp_test_RuEbt8x1Tq8bWV",
        amount: order.amount,
        currency: order.currency,
        name: activeOrg.name,
        description: "Certificate Issuance Fee",
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. Verify payment signature
            await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/payments/verify`, {
              method: "POST",
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
              })
            });
            triggerSupportAlert("Payment Verified", "Your certificate is now unlocked.");
            refreshProfile();
            loadStudentDashboard();
          } catch (e) {
            triggerSupportAlert("Verification Failed", "Signature verification failed: " + e.message);
          }
        },
        prefill: {
          name: currentUser.displayName,
          email: currentUser.email
        },
        theme: {
          color: "#2563eb"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      triggerSupportAlert("Payment Failed", "Payment failed: " + err.message);
    }
  }

  async function handleClaimCertificate() {
    setClaimingCert(true);
    const { batchId } = analytics.summary.certificateEligibility;
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/certificates/claim`, {
        method: "POST"
      });
      triggerSupportAlert("Success", `Certificate claimed successfully! Code: ${res.certificate.certificateNumber}`);
      loadStudentDashboard();
    } catch (err) {
      triggerSupportAlert("Claim Failed", "Claim failed: " + err.message);
    } finally {
      setClaimingCert(false);
    }
  }

  // --- SUPPORT / ZAMMAD ACTIONS ---
  async function fetchSupportTickets() {
    setSupportLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets`);
      setSupportTickets(res.tickets || []);
    } catch (e) {
      console.error("Failed to load support tickets:", e);
    } finally {
      setSupportLoading(false);
    }
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    if (!ticketForm.title || !ticketForm.body) return;
    setSubmittingTicket(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets`, {
        method: "POST",
        body: JSON.stringify({
          ...ticketForm,
          ...ticketContext
        })
      });
      setTicketForm({ title: "", category: "General Question", body: "" });
      setTicketContext({ batchId: "", assignmentId: "", submissionId: "" });
      setShowCreateTicket(false);
      await fetchSupportTickets();
      triggerSupportAlert("Ticket Submitted", "Your support ticket has been submitted successfully. Our team will respond shortly.");
    } catch (err) {
      triggerSupportAlert("Error", err.message || "Failed to submit ticket. Please try again.");
    } finally {
      setSubmittingTicket(false);
    }
  }

  function triggerContextualHelp(category, assign = null, subId = null) {
    const batchId = analytics?.summary?.certificateEligibility?.batchId || selectedBatchId || "";
    const assignmentId = assign?._id || "";
    const submissionId = subId || "";

    setTicketContext({ batchId, assignmentId, submissionId });

    let prefilledTitle = "";
    if (category === "Task Issue" && assign) {
      prefilledTitle = `Need Help with Task: Week ${assign.week} - ${assign.title}`;
    } else if (category === "Evaluation Issue" && assign) {
      prefilledTitle = `Contest Feedback: Week ${assign.week} - ${assign.title}`;
    } else if (category === "Certificate Issue") {
      prefilledTitle = `Help with Certificate Generation / Claim`;
    } else {
      prefilledTitle = `General Support Query`;
    }

    setTicketForm({
      title: prefilledTitle,
      category: category || "General Question",
      body: ""
    });

    setActiveSubTab("support");
    setShowCreateTicket(true);
    setSelectedTicket(null);
  }

  async function handleOpenTicket(ticket) {
    setSelectedTicket(ticket);
    setTicketArticles([]);
    setArticlesLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${ticket.id}/articles`);
      setTicketArticles(res.articles || []);
    } catch (e) {
      console.error("Failed to load ticket articles:", e);
    } finally {
      setArticlesLoading(false);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyBody.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody })
      });
      setReplyBody("");
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${selectedTicket.id}/articles`);
      setTicketArticles(res.articles || []);
    } catch (err) {
      triggerSupportAlert("Error", err.message || "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
  }

  if (!analytics) {
    return <div className="p-10 text-center text-red-500">Failed to load student analytics profile.</div>;
  }

  const { certificateEligibility } = analytics.summary;
  const isEnrolled = !!certificateEligibility?.batchId;

  return (
    <div className="space-y-6 animate-fadeIn">
      {analytics?.enrolledBatches?.length > 1 && (
        <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <Layers className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="text-xs font-bold text-gray-955">Active Program Selection</h4>
              <p className="text-[10px] text-gray-500">You are enrolled in multiple cohorts in this organization. Select one to view coursework.</p>
            </div>
          </div>
          <select 
            value={selectedBatchId || certificateEligibility?.batchId || ""} 
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="bg-white border border-gray-250 rounded-xl px-4 py-2 text-xs text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
          >
            {analytics.enrolledBatches.map(b => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.batchCode})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Analytics KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Completed Tasks</span>
          <h3 className="text-2xl font-extrabold text-gray-950 mt-1">
            {analytics.summary.approvedAssignments} <span className="text-xs text-gray-400">/ {analytics.summary.approvedAssignments + analytics.summary.pendingAssignments}</span>
          </h3>
        </div>
        <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Certificate Status</span>
          <h3 className="text-base font-extrabold text-gray-800 mt-1.5">
            {currentUser.progress?.isCertified ? (
              <span className="text-green-700 flex items-center"><ShieldCheck className="w-5 h-5 mr-1" /> Certified</span>
            ) : (
              <span className="text-gray-500 flex items-center"><Clock className="w-5 h-5 mr-1" /> In Progress</span>
            )}
          </h3>
        </div>
        <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Applied Jobs</span>
          <h3 className="text-2xl font-extrabold text-blue-650 mt-1">{analytics.summary.jobMetrics.applications}</h3>
        </div>
        <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Billing Ledger</span>
          <h3 className="text-2xl font-extrabold text-green-700 mt-1">₹{analytics.summary.paymentStatus.totalPaid / 100}</h3>
        </div>
      </div>

      {/* Switcher Navigation */}
      <div className="border-b border-gray-150 flex overflow-x-auto">
        <button onClick={() => setActiveSubTab("coursework")} className={`py-3 px-5 text-sm font-bold border-b-2 transition ${activeSubTab === "coursework" ? "border-blue-500 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Coursework & Certification
        </button>
        <button onClick={() => setActiveSubTab("collaboration")} className={`py-3 px-5 text-sm font-bold border-b-2 transition ${activeSubTab === "collaboration" ? "border-blue-500 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Collaboration Team
        </button>
        <button onClick={() => setActiveSubTab("careers")} className={`py-3 px-5 text-sm font-bold border-b-2 transition ${activeSubTab === "careers" ? "border-blue-500 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Careers Board
        </button>
        <button onClick={() => setActiveSubTab("billing")} className={`py-3 px-5 text-sm font-bold border-b-2 transition ${activeSubTab === "billing" ? "border-blue-500 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          Billing History
        </button>
        <button onClick={() => setActiveSubTab("support")} className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${activeSubTab === "support" ? "border-blue-500 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          <HelpCircle className="w-3.5 h-3.5" /> Help & Support
        </button>
      </div>

      {/* DETAILS VIEW */}
      <div className="bg-white/30 p-6 rounded-3xl border border-white/40 shadow-sm backdrop-blur-md">
        {!isEnrolled ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-gray-900">No Program Enrollment</h4>
            <p className="text-xs text-gray-650 mt-2 max-w-sm mx-auto">You are not enrolled in any program cohorts for this organization yet. Contact an admin to register.</p>
          </div>
        ) : (
          <>
            {/* COURSEWORK SUB-TAB */}
            {activeSubTab === "coursework" && (
              <div className="space-y-8">
                {/* Certification Claim Widget */}
                {certificateEligibility && (
                  <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-gray-950 flex items-center">
                        <ShieldCheck className="w-5 h-5 text-blue-700 mr-2" /> Certificate Claim Center
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 max-w-lg">
                        {certificateEligibility.eligible 
                          ? "Congratulations! You have completed all course requirements. Claim your verified certificate now."
                          : `Status: ${certificateEligibility.reason}. Submit outstanding work to unlock certification.`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {currentUser.progress?.isCertified ? (
                        (currentUser.batchFee > 0 && !currentUser.hasPaid) ? (
                          <div className="flex items-center gap-2">
                            <button onClick={handlePayCertificationFee} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center transition shadow cursor-pointer">
                              <CreditCard className="w-4 h-4 mr-1.5" /> Pay Certification Fee (₹{currentUser.batchFee})
                            </button>
                            <button type="button" onClick={() => triggerContextualHelp("Certificate Issue")} className="text-xs text-blue-650 hover:text-blue-700 underline font-bold px-2 py-1 cursor-pointer">
                              Help?
                            </button>
                          </div>
                        ) : (
                          <a href="/certificate" className="bg-blue-650 hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center transition shadow-lg">
                            <ShieldCheck className="w-4 h-4 mr-1.5" /> View Claimed Certificate
                          </a>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <button disabled={!certificateEligibility.eligible || claimingCert} onClick={handleClaimCertificate} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            {claimingCert ? <Loader2 className="animate-spin w-4 h-4" /> : "Claim Certificate"}
                          </button>
                          <button type="button" onClick={() => triggerContextualHelp("Certificate Issue")} className="text-xs text-blue-650 hover:text-blue-700 underline font-bold px-2 py-1 cursor-pointer">
                            Help?
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assignments List */}
                {assignmentsLoading ? (
                  <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : !assignmentsData || assignmentsData.assignments?.length === 0 ? (
                  <p className="text-center text-gray-550 py-10 text-xs">No assignment items uploaded for this program.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assignmentsData.assignments.map(assign => {
                      const weekProgress = currentUser.progress?.[`week${assign.week}`];
                      const status = weekProgress?.status || "pending";
                      const feedback = weekProgress?.feedback || "";

                      const isWeekCompleted = status === "approved";
                      const isWeekSubmitted = status === "submitted";
                      const isChangesRequested = status === "changes_requested";
                      const isRejected = status === "rejected";

                      return (
                        <div key={assign._id} className="p-6 bg-white/60 rounded-2xl border border-white/60 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between text-left">
                          <div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded">WEEK {assign.week}</span>
                                {assign.submissionType === "group" && (
                                  <span className="bg-purple-50 text-purple-705 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded">Group Project</span>
                                )}
                              </div>
                              <span className="text-xs font-semibold">
                                {isWeekCompleted ? (
                                  <span className="text-green-700 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Approved</span>
                                ) : isWeekSubmitted ? (
                                  <span className="text-yellow-750 flex items-center"><Clock className="w-4 h-4 mr-1" /> Under Review</span>
                                ) : isChangesRequested ? (
                                  <span className="text-orange-655 flex items-center font-bold animate-pulse"><AlertCircle className="w-4 h-4 mr-1 text-orange-600" /> Changes Requested</span>
                                ) : isRejected ? (
                                  <span className="text-red-650 flex items-center font-bold"><XCircle className="w-4 h-4 mr-1 text-red-600" /> Rejected</span>
                                ) : (
                                  <span className="text-gray-500 flex items-center"><Clock className="w-4 h-4 mr-1" /> Pending</span>
                                )}
                              </span>
                            </div>
                            <h4 className="text-base font-extrabold text-gray-955 mt-3">{assign.title}</h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-3 leading-relaxed">{assign.description}</p>
                            
                            {assign.submissionType === "group" && (
                              <div className={`mt-3 p-3 rounded-xl border text-xs ${group ? "bg-purple-50/30 border-purple-100 text-purple-800" : "bg-orange-50/40 border-orange-100 text-orange-850"}`}>
                                {group ? (
                                  <p className="flex items-center"><Users className="w-3.5 h-3.5 mr-1.5 inline" /> Team: <strong className="font-bold ml-1">{group.name}</strong> <span className="text-[10px] font-mono text-purple-500 ml-1.5">({group.groupId})</span></p>
                                ) : (
                                  <div>
                                    <p className="font-bold flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1.5 text-orange-600 inline" /> Group Team Required</p>
                                    <p className="mt-1 text-[11px] text-orange-700 leading-normal">
                                      This is a group assignment. Please head to the <button onClick={() => setActiveSubTab("collaboration")} className="font-black underline text-blue-600 hover:text-blue-750 inline cursor-pointer">Collaboration</button> tab to join or form a team before submitting.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {feedback && (
                              <div className="mt-4 p-3 bg-red-50/40 border border-red-100 rounded-xl text-xs text-red-800">
                                <strong className="font-bold block text-red-900">Evaluator Feedback:</strong>
                                <p className="mt-1 leading-relaxed whitespace-pre-wrap">{feedback}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-gray-150">
                            {isWeekCompleted ? (
                              <div className="w-full py-2 bg-green-50 text-green-700 text-xs text-center rounded-lg font-bold border border-green-100">
                                Approved • Core Complete
                              </div>
                            ) : isWeekSubmitted ? (
                              <div className="w-full py-2 bg-yellow-50 text-yellow-750 text-xs text-center rounded-lg font-bold border border-yellow-100">
                                Approval Pending
                              </div>
                            ) : assign.submissionType === "group" && !group ? (
                              <button onClick={() => setActiveSubTab("collaboration")} className="w-full py-2 bg-gray-100 border border-gray-200 text-gray-405 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex justify-center items-center">
                                <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> Setup Team to Submit
                              </button>
                            ) : isChangesRequested ? (
                              <button onClick={() => { setSelectedAssignment(assign); setShowSubmitModal(true); }} className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">
                                Re-submit Work
                              </button>
                            ) : isRejected ? (
                              <div className="w-full py-2 bg-red-50 text-red-650 text-xs text-center rounded-lg font-bold border border-red-100">
                                Rejected
                              </div>
                            ) : (
                              <button onClick={() => { setSelectedAssignment(assign); setShowSubmitModal(true); }} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">
                                Submit Work
                              </button>
                            )}
                          </div>
                          
                          <div className="mt-3 flex justify-between items-center px-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => triggerContextualHelp("Task Issue", assign)}
                              className="text-blue-650 hover:text-blue-700 underline font-bold cursor-pointer"
                            >
                              Need Help with Task?
                            </button>
                            {(isChangesRequested || isRejected || isWeekSubmitted) && (
                              <button
                                type="button"
                                onClick={() => triggerContextualHelp("Evaluation Issue", assign)}
                                className="text-amber-650 hover:text-amber-700 underline font-bold cursor-pointer"
                              >
                                Need Help with Review?
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* COLLABORATION SUB-TAB */}
            {activeSubTab === "collaboration" && (
              <div className="space-y-6">
                {groupLoading ? (
                  <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : !group ? (
                  pendingJoinRequest ? (
                    /* Pending Join Request display */
                    <div className="max-w-md mx-auto p-8 bg-white/60 border border-white/60 rounded-2xl shadow-xs text-center space-y-6 animate-fadeIn text-left">
                      <Clock className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
                      <div className="text-center">
                        <h4 className="text-base font-bold text-gray-900">Join Request Pending</h4>
                        <p className="text-xs text-gray-555 mt-2">
                          Your request to join the team <strong className="text-gray-800">"{pendingJoinRequest.groupName}"</strong> is currently awaiting approval from the evaluator.
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50/30 border border-yellow-100 rounded-xl text-left space-y-1">
                        <p className="text-xs text-yellow-850 font-bold flex items-center"><AlertCircle className="w-4 h-4 mr-1.5" /> Request Details</p>
                        <p className="text-[11px] text-yellow-750">Target Team: {pendingJoinRequest.groupName}</p>
                        <p className="text-[11px] text-yellow-750 font-mono">Team Code: {pendingJoinRequest.groupId}</p>
                        {pendingJoinRequest.previousGroupName && (
                          <p className="text-[11px] text-amber-700 mt-1">
                            Note: If approved, you will automatically be moved from your current group <strong>"{pendingJoinRequest.previousGroupName}"</strong>.
                          </p>
                        )}
                      </div>
                      <button onClick={handleCancelJoinRequest} className="w-full py-2.5 bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-lg cursor-pointer transition">
                        Cancel Join Request
                      </button>
                    </div>
                  ) : (
                    /* Form or Join Team options */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start text-left">
                      {/* Left Column: Create group */}
                      <div className="p-8 bg-white/60 border border-white/60 rounded-2xl text-center space-y-6">
                        <Users className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <h4 className="text-base font-bold text-gray-900">Form New Group Team</h4>
                          <p className="text-xs text-gray-555 mt-1">Form a new group proposal. Note: Evaluator approval is required to activate the group.</p>
                        </div>

                        {showGroupCreate ? (
                          <form onSubmit={handleCreateGroup} className="space-y-2 text-left animate-fadeIn">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Team Name</label>
                            <input type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full p-2.5 bg-white border border-gray-250 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="Coyote Coders" />
                            <div className="flex gap-2">
                              <button type="submit" className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded cursor-pointer hover:bg-blue-555">Submit Proposal</button>
                              <button type="button" onClick={() => setShowGroupCreate(false)} className="px-3 py-2 border border-gray-200 text-gray-500 text-xs rounded hover:bg-gray-50 cursor-pointer">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <button onClick={() => setShowGroupCreate(true)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer">
                            Create Proposal
                          </button>
                        )}
                      </div>

                      {/* Right Column: Existing cohort groups */}
                      <div className="p-8 bg-white/60 border border-white/60 rounded-2xl space-y-6">
                        <div>
                          <h4 className="text-base font-bold text-gray-900">Join Existing Active Group</h4>
                          <p className="text-xs text-gray-555 mt-1">Select and join an already active team in this cohort.</p>
                        </div>

                        {activeCohortGroups.length === 0 ? (
                          <p className="text-xs text-gray-400 font-semibold py-6 text-center">No active groups available to join in this cohort.</p>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {activeCohortGroups.map(g => (
                              <div key={g.groupId} className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl flex items-center justify-between gap-4">
                                <div>
                                  <h5 className="text-xs font-bold text-gray-808">{g.name}</h5>
                                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{g.members?.length || 0}/{g.maxMembers || 4} members • Code: {g.groupId}</p>
                                </div>
                                <button
                                  onClick={() => handleDirectJoinGroup(g.groupCode)}
                                  className="px-3.5 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-lg transition cursor-pointer"
                                >
                                  Join
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : group.status === 'pending_approval' ? (
                  /* Pending Approval request display */
                  <div className="max-w-md mx-auto p-8 bg-white/60 border border-white/60 rounded-2xl shadow-xs text-center space-y-6 animate-fadeIn">
                    <Clock className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Group Registration Pending</h4>
                      <p className="text-xs text-gray-550 mt-2">
                        Your group proposal for <strong className="text-gray-800">"{group.name}"</strong> is currently awaiting approval from the evaluator.
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50/30 border border-yellow-100 rounded-xl text-left">
                      <p className="text-xs text-yellow-850 font-bold flex items-center"><Info className="w-4 h-4 mr-1.5" /> Request Details</p>
                      <p className="text-[11px] text-yellow-750 mt-1">Group Code: {group.groupId}</p>
                      <p className="text-[11px] text-yellow-750">Proposed Owner: you</p>
                    </div>
                    <button onClick={handleLeaveGroup} className="w-full py-2 bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-lg cursor-pointer transition">
                      Cancel Proposal Request
                    </button>
                  </div>
                ) : group.status === 'rejected' ? (
                  /* Rejected request display */
                  <div className="max-w-md mx-auto p-8 bg-white/60 border border-white/60 rounded-2xl shadow-xs text-center space-y-6 animate-fadeIn">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Group Proposal Rejected</h4>
                      <p className="text-xs text-gray-550 mt-2">
                        Your request for team <strong className="text-gray-800">"{group.name}"</strong> was rejected by the evaluator.
                      </p>
                    </div>

                    {group.suggestedGroupId ? (
                      <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-xl text-left space-y-3">
                        <div>
                          <p className="text-xs text-purple-850 font-bold flex items-center"><Users className="w-4 h-4 mr-1.5" /> Evaluator Suggestion</p>
                          <p className="text-[11px] text-purple-750 mt-1 leading-relaxed">
                            The evaluator strongly suggests you join this existing active group instead:
                          </p>
                        </div>
                        <div className="p-3 bg-white border border-purple-150/40 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-purple-900 font-mono">Suggested Code: {group.suggestedGroupId}</span>
                          </div>
                          <button
                            onClick={() => handleDirectJoinGroup(group.suggestedGroupId)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                          >
                            Join Suggested Group
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 font-semibold">No alternate suggestions were provided by the evaluator.</p>
                    )}

                    <button onClick={handleLeaveGroup} className="w-full py-2 bg-gray-100 hover:bg-gray-200 border border-gray-250 text-gray-700 text-xs font-bold rounded-lg cursor-pointer transition">
                      Dismiss & Try Again
                    </button>
                  </div>
                ) : (
                  /* My Group dashboard & Chat */
                  <div className="space-y-6">
                    {pendingJoinRequest && (
                      <div className="bg-yellow-50 border border-yellow-250 p-4 rounded-2xl flex justify-between items-center text-xs text-yellow-855 shadow-2xs">
                        <div>
                          <span>Your request to join team <strong>"{pendingJoinRequest.groupName}"</strong> is pending evaluator approval.</span>
                          {pendingJoinRequest.previousGroupName && (
                            <span className="block text-[10px] text-yellow-700 mt-0.5">Upon approval, you will automatically transfer from your current group.</span>
                          )}
                        </div>
                        <button onClick={handleCancelJoinRequest} className="px-3 py-1.5 bg-white border border-yellow-200 rounded-lg font-bold text-[11px] text-red-650 hover:bg-red-50 cursor-pointer transition">
                          Cancel Request
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start text-left">
                      <div className="xl:col-span-2 space-y-6">
                      {/* Details Box */}
                      <div className="bg-white/60 border border-white/60 p-6 rounded-2xl shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-extrabold text-gray-950">{group.name}</h4>
                            <span className="text-xs font-mono text-gray-400">Group Code: {group.groupCode}</span>
                          </div>
                          <button onClick={handleLeaveGroup} className="text-xs text-red-650 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-semibold cursor-pointer">
                            Leave Group
                          </button>
                        </div>

                        {/* Register repo url */}
                        <form onSubmit={handleRegisterRepo} className="pt-4 border-t border-gray-150 space-y-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Team Repository URL (GitHub)</label>
                          <div className="flex gap-2">
                            <input type="url" required value={repoUrlInput} onChange={(e) => setRepoUrlInput(e.target.value)} className="flex-1 p-2 bg-white border border-gray-250 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" placeholder="https://github.com/..." />
                            <button disabled={registeringRepo} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded transition cursor-pointer">
                              {registeringRepo ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Repository"}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Group members list */}
                      <div className="bg-white/60 border border-white/60 p-6 rounded-2xl shadow-xs">
                        <h4 className="text-sm font-bold text-gray-955 mb-4">Group Members ({group.memberDetails?.length || 0})</h4>
                        <div className="divide-y divide-gray-150">
                          {group.memberDetails?.map(mem => (
                            <div key={mem.uid} className="py-3 flex justify-between items-center text-sm">
                              <span className="font-semibold text-gray-800">{mem.displayName}</span>
                              <span className="text-xs text-gray-400 font-mono">{mem.email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Chat Widget */}
                    <div className="bg-white/60 border border-white/60 shadow-xs rounded-2xl overflow-hidden flex flex-col h-[450px]">
                      <div className="p-4 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-950 flex items-center"><Send className="w-3.5 h-3.5 mr-1.5 text-blue-650" /> Group Chat</span>
                        <button onClick={() => fetchGroupMessages()} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded cursor-pointer">
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
                        {groupMessages.length === 0 ? (
                          <p className="text-gray-400 text-center py-20 text-xs font-semibold">No group messages recorded yet.</p>
                        ) : (
                          groupMessages.map((m, idx) => (
                            <div key={idx} className={`flex flex-col space-y-0.5 ${m.senderId === currentUser.uid ? "items-end" : "items-start"}`}>
                              <span className="text-[9px] text-gray-400 font-semibold mb-0.5">{m.senderName}</span>
                              <div className={`p-2.5 max-w-[85%] text-xs rounded-xl ${m.senderId === currentUser.uid ? "bg-blue-50 border border-blue-200 text-black rounded-tr-none shadow-xs" : "bg-white border border-gray-200 text-black rounded-tl-none shadow-xs"}`}>
                                {m.text}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={handleSendGroupMessage} className="p-2 border-t border-gray-150 bg-white flex gap-2">
                        <input type="text" required value={groupChatInput} onChange={(e) => setGroupChatInput(e.target.value)} placeholder="Send message..." className="flex-1 p-2 bg-white border border-gray-250 rounded text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-105" />
                        <button disabled={sendingGroupMsg} className="bg-blue-600 text-white p-2 rounded transition cursor-pointer">
                          {sendingGroupMsg ? <Loader2 className="animate-spin w-3 h-3" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              </div>
            )}

            {/* CAREERS SUB-TAB */}
            {activeSubTab === "careers" && (
              <div className="space-y-8 animate-fadeIn text-left">
                {/* Applied Jobs */}
                {myApplications.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-955">Your Applications Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myApplications.map(app => (
                        <div key={app._id} className="p-4 bg-white/60 rounded-xl border border-white/60 shadow-xs flex justify-between items-center text-sm">
                          <div>
                            <span className="font-bold text-gray-800">Opening ID: {app.jobId}</span>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">Applied on: {new Date(app.appliedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full font-mono uppercase ${app.status === "selected" ? "bg-green-50 text-green-700 border border-green-100" : app.status === "rejected" ? "bg-red-50 text-red-650 border border-red-100" : "bg-blue-50 text-blue-650 border border-blue-100"}`}>
                              {app.status}
                            </span>
                            {app.status === "applied" && (
                              <button onClick={() => handleWithdrawJob(app._id)} className="text-xs text-gray-400 hover:text-red-650 font-semibold cursor-pointer">
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Published Openings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-955">Available Job Openings</h4>
                  {jobsLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : jobsList.length === 0 ? (
                    <p className="text-center text-gray-500 py-10 text-xs">No active job listings found for this organization.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {jobsList.map(job => {
                        const hasApplied = myApplications.some(app => app.jobId === job._id);
                        return (
                          <div key={job._id} className="p-6 bg-white/60 rounded-2xl border border-white/60 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div>
                              <h5 className="font-extrabold text-gray-950 text-base">{job.title}</h5>
                              <p className="text-xs text-gray-400 mt-0.5 font-semibold">{job.department} • {job.location} • {job.jobType}</p>
                              <p className="text-xs text-gray-650 mt-3 line-clamp-3 leading-relaxed">{job.description}</p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-150">
                              {hasApplied ? (
                                <div className="w-full py-2 bg-blue-50 text-blue-650 text-xs text-center rounded-lg font-bold border border-blue-100">
                                  Application Submitted
                                </div>
                              ) : (
                                <button onClick={() => handleApplyJob(job._id)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer">
                                  Apply Now
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BILLING HISTORY SUB-TAB */}
            {activeSubTab === "billing" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn text-left">
                {/* Billing logs */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-sm font-bold text-gray-955">Payment Ledger Invoices</h4>
                  {billingHistory.length === 0 ? (
                    <p className="text-gray-400 text-xs py-10 text-center font-semibold">No payment billing records logged.</p>
                  ) : (
                    <div className="bg-white/60 border border-white/60 shadow-xs rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-500 bg-gray-50/50 uppercase tracking-wider">
                              <th className="p-4">Payment ID</th>
                              <th className="p-4">Amount</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150/80 text-xs">
                            {billingHistory.map(bill => (
                              <tr key={bill._id}>
                                <td className="p-4 font-mono text-gray-600">{bill.paymentId || "N/A"}</td>
                                <td className="p-4 font-extrabold text-gray-950 text-sm">₹{bill.amount / 100}</td>
                                <td className="p-4 font-mono">
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full uppercase ${bill.status === "captured" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-650 border border-red-100"}`}>
                                    {bill.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right text-gray-400 font-mono">{new Date(bill.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Certificates List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-955">My Verified Certificates</h4>
                  {myCertificates.length === 0 ? (
                    <p className="text-gray-400 text-xs py-10 text-center font-semibold">No certificates claimed yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {myCertificates.map(cert => (
                        <div key={cert._id} className="p-4 bg-white/60 border border-white/60 shadow-xs rounded-2xl flex justify-between items-center text-sm">
                          <div>
                            <span className="font-bold text-gray-800 font-mono">{cert.certificateNumber}</span>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">Issued: {new Date(cert.createdAt).toLocaleDateString()}</p>
                          </div>
                          <a href={`/verify/${cert.certificateNumber}`} target="_blank" rel="noreferrer" className="text-xs text-blue-750 hover:text-blue-650 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg font-semibold">
                            Verify File
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HELP & SUPPORT SUB-TAB */}
            {activeSubTab === "support" && (
              <div className="space-y-6 animate-fadeIn">
                {!selectedTicket ? (
                  // ── Ticket List View ──────────────────────────────────
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-gray-955">Help & Support</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Submit a ticket and track replies from our support team.</p>
                      </div>
                      <button
                        onClick={() => setShowCreateTicket(v => !v)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        {showCreateTicket ? "Cancel" : "Raise a Ticket"}
                      </button>
                    </div>

                    {/* Create Ticket Form */}
                    {showCreateTicket && (
                      <div className="bg-white/60 border border-blue-100 rounded-2xl p-6 shadow-xs animate-fadeIn">
                        <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-600" /> New Support Ticket</h5>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Ticket Title</label>
                              <input
                                type="text"
                                required
                                value={ticketForm.title}
                                onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="Brief summary of your issue"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Category</label>
                              <select
                                value={ticketForm.category}
                                onChange={e => setTicketForm(p => ({ ...p, category: e.target.value }))}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                              >
                                <option>General Question</option>
                                <option>Technical Issue</option>
                                <option>Task Issue</option>
                                <option>Evaluation Issue</option>
                                <option>Certificate Issue</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Description</label>
                            <textarea
                              required
                              value={ticketForm.body}
                              onChange={e => setTicketForm(p => ({ ...p, body: e.target.value }))}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 h-28 resize-none"
                              placeholder="Describe your issue in detail so we can help you faster..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowCreateTicket(false)} className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 cursor-pointer transition">Cancel</button>
                            <button disabled={submittingTicket} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
                              {submittingTicket ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Submit Ticket"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Ticket List */}
                    {supportLoading ? (
                      <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : supportTickets.length === 0 ? (
                      <div className="text-center py-16 space-y-3">
                        <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
                        <p className="text-xs text-gray-400 font-semibold">No support tickets yet. Raise one if you need help!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {supportTickets.map(ticket => {
                          const stateColor = ticket.stateName === 'closed' ? 'bg-green-50 text-green-700 border-green-100'
                            : ticket.stateName === 'pending reminder' || ticket.stateName === 'pending close' ? 'bg-yellow-50 text-yellow-750 border-yellow-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100';
                          return (
                            <div
                              key={ticket.id}
                              onClick={() => handleOpenTicket(ticket)}
                              className="p-4 bg-white/60 border border-white/60 rounded-2xl shadow-xs hover:shadow-sm hover:bg-white/80 transition cursor-pointer flex justify-between items-center group"
                            >
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-950 group-hover:text-blue-650 transition">{ticket.title}</p>
                                <p className="text-[10px] text-gray-400 font-mono">#{ticket.number} • {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : ""}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${stateColor}`}>
                                {ticket.stateName || "open"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  // ── Ticket Conversation View ──────────────────────────
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSelectedTicket(null); setTicketArticles([]); }}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 rotate-180" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-bold text-gray-950 truncate">{selectedTicket.title}</h5>
                        <p className="text-[10px] text-gray-400 font-mono">Ticket #{selectedTicket.number}</p>
                      </div>
                      {(() => {
                        const stateColor = selectedTicket.stateName === 'closed' ? 'bg-green-50 text-green-700 border-green-100'
                          : selectedTicket.stateName === 'pending reminder' || selectedTicket.stateName === 'pending close' ? 'bg-yellow-50 text-yellow-750 border-yellow-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100';
                        return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${stateColor}`}>{selectedTicket.stateName || "open"}</span>;
                      })()}
                    </div>

                    {/* Message Thread */}
                    <div className="bg-white/60 border border-white/60 rounded-2xl overflow-hidden flex flex-col shadow-xs" style={{ minHeight: '350px', maxHeight: '450px' }}>
                      <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {articlesLoading ? (
                          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : ticketArticles.length === 0 ? (
                          <p className="text-center text-gray-400 text-xs py-10">No messages yet.</p>
                        ) : (
                          ticketArticles.filter(a => !a.internal).map(article => {
                            const isMe = !!article.isCustomer;
                            
                            // Clean up structural context header to keep chat bubbles sleek and readable
                            const getCleanBody = (bodyText) => {
                              if (!bodyText) return "";
                              if (bodyText.includes("Shyoski Context")) {
                                const parts = bodyText.split("Problem:");
                                if (parts.length > 1) {
                                  return parts[1].replace(/^\s*[\r\n]/gm, '').trim(); // clean leading empty lines
                                }
                              }
                              return bodyText;
                            };

                            const cleanHtml = getCleanBody(article.body);

                            return (
                              <div key={article.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <span className="text-[9px] text-gray-400 font-bold mb-0.5">
                                  {isMe ? "You" : (article.sender === "System" ? "System Notification" : "Support Team")}
                                </span>
                                <div
                                  className={`p-3 max-w-[80%] text-xs rounded-2xl leading-relaxed whitespace-pre-wrap ${
                                    isMe
                                      ? "bg-blue-600 text-white rounded-tr-none"
                                      : "bg-gray-100 text-gray-900 rounded-tl-none"
                                  }`}
                                  dangerouslySetInnerHTML={{ __html: cleanHtml }}
                                />
                                <span className="text-[9px] text-gray-400 mt-0.5">
                                  {article.createdAt ? new Date(article.createdAt).toLocaleString() : ""}
                                </span>
                              </div>
                            );
                          })
                        )}
                        <div ref={ticketEndRef} />
                      </div>

                      {/* Reply Input */}
                      {selectedTicket.stateName !== 'closed' && (
                        <form onSubmit={handleSendReply} className="p-3 border-t border-gray-150 bg-white flex gap-2 shrink-0">
                          <input
                            type="text"
                            required
                            value={replyBody}
                            onChange={e => setReplyBody(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-100"
                          />
                          <button disabled={sendingReply} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50">
                            {sendingReply ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* SUPPORT ALERT MODAL */}
      {supportAlert.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 text-center">
            <h3 className="text-base font-extrabold text-gray-955">{supportAlert.title}</h3>
            <p className="text-xs text-gray-550 leading-relaxed">{supportAlert.message}</p>
            <button
              type="button"
              onClick={() => setSupportAlert({ isOpen: false, title: "", message: "" })}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* SUBMISSION FORM MODAL */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md text-gray-900 border border-gray-250/50 shadow-glass backdrop-blur-md text-left">
            <h3 className="text-xl font-extrabold mb-1 text-gray-950">Submit Assignment Work</h3>
            <p className="text-xs text-gray-500 font-semibold">Week {selectedAssignment.week}: {selectedAssignment.title}</p>
            
            <form onSubmit={handleSubmitAssignment} className="space-y-4 mt-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Repository / Deployment URL</label>
                <input type="url" required value={submittingUrl} onChange={(e) => setSubmittingUrl(e.target.value)} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-100" placeholder="https://github.com/..." />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Comments / Notes</label>
                <textarea value={submittingComments} onChange={(e) => setSubmittingComments(e.target.value)} className="w-full p-2.5 bg-white border border-gray-250 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 h-24" placeholder="Mention features, bugs or setup details..." />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 text-xs font-semibold cursor-pointer">Cancel</button>
                <button disabled={submittingProgress} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition cursor-pointer">
                  {submittingProgress ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Commit Submission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM LEAVE GROUP CONFIRMATION MODAL */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/90 border border-white/60 rounded-3xl w-full max-w-md p-6 shadow-2xl backdrop-blur-md text-left space-y-6 animate-scaleIn">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-650 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-extrabold text-gray-955">
                  {group?.status === 'pending_approval' || group?.status === 'rejected'
                    ? "Cancel Proposal Request"
                    : "Leave Collaboration Group"}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line font-medium">
                  {group?.status === 'pending_approval' || group?.status === 'rejected'
                    ? `Are you sure you want to cancel your group proposal request for "${group?.name}"?`
                    : `⚠️ WARNING: Are you sure you want to leave your active group team "${group?.name}"?\n\nAny submitted group assignments will remain associated with this group, and you will need to join or form another group to continue.`}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="px-4 py-2 border border-gray-250 text-gray-700 hover:text-gray-900 hover:bg-gray-55 text-xs font-bold rounded-xl cursor-pointer transition"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  executeLeaveGroup();
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-sm"
              >
                Confirm & Exit
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
                className="px-4 py-2 border border-gray-250 text-gray-750 text-xs font-bold rounded-xl cursor-pointer hover:bg-gray-55 transition"
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
