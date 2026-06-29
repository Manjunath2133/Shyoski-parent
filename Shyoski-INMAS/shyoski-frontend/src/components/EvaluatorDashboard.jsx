import { useEffect, useState } from "react";
import { authenticatedFetch } from "../api";
import { useTenant } from "../context/TenantContext";
import {
  Loader2, CheckCircle, Clock, XCircle, AlertCircle, FileText, ArrowRight, Check, X, ShieldAlert, Users,
  HelpCircle, Send, RefreshCw
} from "lucide-react";
import GroupManager from "./GroupManager";

export default function EvaluatorDashboard() {
  const { activeOrg } = useTenant();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "" });
  const triggerAlert = (title, message) => setAlertModal({ isOpen: true, title, message });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const triggerConfirm = (title, message, onConfirm) => setConfirmModal({ isOpen: true, title, message, onConfirm });
  
  // Submissions queue
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Review Workspace State
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: "approved", grade: "", feedback: "" });

  // Group Proposals states
  const [activeTab, setActiveTab] = useState("coursework");
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [suggestingGroupId, setSuggestingGroupId] = useState(null);
  const [selectedSuggestTarget, setSelectedSuggestTarget] = useState("");
  const [groupsSubTab, setGroupsSubTab] = useState("proposals");
  const [selectedManageBatchId, setSelectedManageBatchId] = useState("");

  // Support / Help-desk states (staff view)
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  const [supportArticles, setSupportArticles] = useState([]);
  const [supportArticlesLoading, setSupportArticlesLoading] = useState(false);
  const [staffReplyBody, setStaffReplyBody] = useState("");
  const [sendingStaffReply, setSendingStaffReply] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    loadEvaluatorDashboard(true);
  }, [activeOrg]);

  async function loadEvaluatorDashboard(showSpinner = false) {
    if (showSpinner || !data) setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/dashboard/evaluator?forceReload=true`);
      setData(res);
      await Promise.all([
        fetchPendingQueue(res.assignedBatches || []),
        fetchGroupProposals(res.assignedBatches || [])
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroupProposals(assignedBatches = []) {
    setGroupsLoading(true);
    try {
      let allGroups = [];
      for (const batch of assignedBatches) {
        const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batch._id}/groups`);
        allGroups = allGroups.concat(res.groups || []);
      }
      setGroups(allGroups);
    } catch (e) {
      console.error("Failed to load group proposals:", e);
    } finally {
      setGroupsLoading(false);
    }
  }

  async function fetchPendingQueue() {
    setQueueLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/staff/submissions?status=pending`);
      setQueue(res.submissions || []);
    } catch (e) {
      console.error("Failed to load submissions queue:", e);
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleClearHistory() {
    triggerConfirm(
      "Clear Evaluation History",
      "Are you sure you want to clear your local evaluation history view? This will hide past reviews from your dashboard but keep them archived safely.",
      async () => {
        try {
          await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/staff/evaluations/clear-history`, {
            method: "POST"
          });
          await loadEvaluatorDashboard(false);
          triggerAlert("Success", "Evaluation history cleared!");
        } catch (err) {
          triggerAlert("Error", "Failed to clear history: " + err.message);
        }
      }
    );
  }

  async function handleOpenReview(sub) {
    // Fetch detailed submission if needed
    try {
      const details = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/submissions/${sub._id}`);
      setActiveSubmission(details.submission || sub);
      setReviewForm({
        status: "approved",
        grade: "",
        feedback: ""
      });
    } catch {
      setActiveSubmission(sub);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!activeSubmission) return;
    setSubmittingReview(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/submissions/${activeSubmission._id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          status: reviewForm.status,
          grade: reviewForm.grade,
          feedback: reviewForm.feedback
        })
      });
      await loadEvaluatorDashboard(false);
      setActiveSubmission(null);
      triggerAlert("Success", `Review submitted successfully as '${reviewForm.status}'!`);
    } catch (err) {
      triggerAlert("Error", "Failed to submit review: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleApproveGroup(batchId, groupId) {
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${groupId}/approve`, {
        method: "POST"
      });
      await fetchGroupProposals(data.assignedBatches || []);
      triggerAlert("Success", "Group approved successfully!");
    } catch (e) {
      triggerAlert("Error", "Failed to approve group: " + e.message);
    }
  }

  async function handleSuggestGroup(batchId, groupId) {
    if (!selectedSuggestTarget) return;
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${batchId}/groups/${groupId}/suggest`, {
        method: "POST",
        body: JSON.stringify({ suggestedGroupId: selectedSuggestTarget })
      });
      await fetchGroupProposals(data.assignedBatches || []);
      setSuggestingGroupId(null);
      setSelectedSuggestTarget("");
      triggerAlert("Success", "Suggestion submitted and group proposal rejected!");
    } catch (e) {
      triggerAlert("Error", "Failed to submit suggestion: " + e.message);
    }
  }

  // --- SUPPORT / ZAMMAD STAFF ACTIONS ---
  async function fetchAllSupportTickets() {
    setSupportLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/all`);
      setSupportTickets(res.tickets || []);
    } catch (e) {
      console.error("Failed to load support tickets:", e);
    } finally {
      setSupportLoading(false);
    }
  }

  async function handleOpenSupportTicket(ticket) {
    setSelectedSupportTicket(ticket);
    setSupportArticles([]);
    setSupportArticlesLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${ticket.id}/articles`);
      setSupportArticles(res.articles || []);
    } catch (e) {
      console.error("Failed to load ticket articles:", e);
    } finally {
      setSupportArticlesLoading(false);
    }
  }

  async function handleStaffReply(e) {
    e.preventDefault();
    if (!staffReplyBody.trim() || !selectedSupportTicket) return;
    setSendingStaffReply(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${selectedSupportTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ body: staffReplyBody })
      });
      setStaffReplyBody("");
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${selectedSupportTicket.id}/articles`);
      setSupportArticles(res.articles || []);
    } catch (err) {
      triggerAlert("Error", err.message || "Failed to send reply.");
    } finally {
      setSendingStaffReply(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
  }

  if (!data) {
    return <div className="p-10 text-center text-gray-500">Failed to load evaluator dashboard metrics.</div>;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/50 p-6 rounded-2xl border border-white/60 backdrop-blur-sm shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase block tracking-wider">Assigned Batches</span>
          <h3 className="text-3xl font-extrabold text-gray-950 mt-1">{data.summary.assignedBatchesCount}</h3>
        </div>
        <div className="bg-white/50 p-6 rounded-2xl border border-white/60 backdrop-blur-sm shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase block tracking-wider">Pending Review</span>
          <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{queue.length}</h3>
        </div>
        <div className="bg-white/50 p-6 rounded-2xl border border-white/60 backdrop-blur-sm shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase block tracking-wider">Approved Reviews</span>
          <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{data.summary.approvedSubmissionsCount}</h3>
        </div>
        <div className="bg-white/50 p-6 rounded-2xl border border-white/60 backdrop-blur-sm shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase block tracking-wider">Avg Turnaround</span>
          <h3 className="text-3xl font-extrabold text-blue-600 mt-1">{data.summary.averageReviewTurnaroundHours} Hrs</h3>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-250">
        <button
          onClick={() => setActiveTab("coursework")}
          className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition ${activeTab === "coursework" ? "border-blue-600 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}
        >
          Coursework Submissions
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition ${activeTab === "groups" ? "border-blue-600 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}
        >
          Group Proposals ({groups.filter(g => g.status === 'pending_approval').length})
        </button>
        <button
          onClick={() => { setActiveTab("support"); fetchAllSupportTickets(); }}
          className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition flex items-center gap-1.5 ${activeTab === "support" ? "border-blue-600 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Support Tickets
        </button>
      </div>

      {activeTab === "coursework" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* Pending Submissions Queue */}
          <div className="xl:col-span-2 bg-white/50 rounded-2xl border border-white/60 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-955 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-amber-500" /> Pending Reviews Queue
            </h3>
            {queueLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : queue.length === 0 ? (
              <p className="text-center text-gray-500 py-12 text-sm">Review queue is empty. All submissions evaluated!</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {queue.map(sub => (
                  <div key={sub._id} className="py-4 flex justify-between items-center hover:bg-blue-50/30 px-2 rounded-xl transition">
                    <div>
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">Week {sub.weekNumber}</span>
                      <h4 className="text-sm font-semibold text-gray-900 mt-1.5">
                        {sub.groupId ? `Team: ${sub.groupId} (Submitted by: ${sub.submittedBy})` : `Candidate ID: ${sub.uid}`}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{new Date(sub.submittedAt || sub.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleOpenReview(sub)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center transition shadow-md cursor-pointer">
                      Evaluate Work <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evaluation History */}
          <div className="bg-white/50 rounded-2xl border border-white/60 backdrop-blur-sm p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-955">Your Evaluation History</h3>
              {data.recentReviews.length > 0 && (
                <button onClick={handleClearHistory} className="text-[10px] font-bold text-red-650 hover:text-red-700 bg-red-50 hover:bg-red-100/85 px-2 py-1 rounded-lg border border-red-100 cursor-pointer transition">
                  Clear History
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {data.recentReviews.map((rev, idx) => (
                <div key={idx} className="p-3 bg-white/80 rounded-xl border border-gray-100 flex flex-col space-y-1 shadow-2xs">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-gray-400">{new Date(rev.reviewedAt).toLocaleDateString()}</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${rev.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                      {rev.status.toUpperCase()}
                    </span>
                  </div>
                  <strong className="text-xs text-gray-800">Candidate: {rev.displayName || rev.uid}</strong>
                  {rev.grade && <span className="text-[10px] text-gray-500">Grade: <strong className="text-gray-800">{rev.grade}</strong></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Group tab */
        <div className="bg-white/50 rounded-2xl border border-white/60 backdrop-blur-sm p-6 shadow-sm text-left space-y-6">
          <div className="flex gap-4 border-b border-gray-200 pb-2">
            <button
              onClick={() => setGroupsSubTab("proposals")}
              className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition ${groupsSubTab === "proposals" ? "border-blue-600 text-blue-650 font-extrabold" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              Pending Proposals ({groups.filter(g => g.status === 'pending_approval').length})
            </button>
            <button
              onClick={() => setGroupsSubTab("manage")}
              className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition ${groupsSubTab === "manage" ? "border-blue-600 text-blue-650 font-extrabold" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              Manage Cohort Teams
            </button>
          </div>

          {groupsSubTab === "proposals" ? (
            <div>
              <h3 className="text-base font-bold text-gray-955 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-650" /> Pending Group Proposals
              </h3>
              {groupsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : groups.filter(g => g.status === 'pending_approval').length === 0 ? (
                <p className="text-center text-gray-500 py-12 text-sm font-semibold">No pending group proposals are awaiting approval.</p>
              ) : (
                <div className="divide-y divide-gray-150">
                  {groups.filter(g => g.status === 'pending_approval').map(g => {
                    const assignedBatch = data.assignedBatches?.find(b => b._id === g.batchId?.toString());
                    return (
                      <div key={g.groupId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{g.name}</h4>
                          <p className="text-xs text-gray-455 mt-0.5">Cohort: {assignedBatch?.name || assignedBatch?.title || "Unknown"} • Code: {g.groupId}</p>
                          <p className="text-xs text-gray-400 mt-1">Proposed Owner: <strong className="text-gray-655">{g.ownerUid}</strong></p>
                        </div>

                        <div className="flex items-center gap-3">
                          {suggestingGroupId === g.groupId ? (
                            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 p-2 rounded-xl">
                              <span className="text-xs font-bold text-purple-800">Suggest Active Team:</span>
                              <select
                                value={selectedSuggestTarget}
                                onChange={(e) => setSelectedSuggestTarget(e.target.value)}
                                className="p-1.5 bg-white border border-gray-250 rounded-lg text-xs text-gray-900 font-bold outline-none"
                              >
                                <option value="">-- Select Active Team --</option>
                                {groups.filter(activeG => activeG.status === 'active' && activeG.batchId?.toString() === g.batchId?.toString()).map(activeG => (
                                  <option key={activeG.groupId} value={activeG.groupId}>{activeG.name} ({activeG.groupId})</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!selectedSuggestTarget}
                                onClick={() => handleSuggestGroup(g.batchId, g.groupId)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition disabled:opacity-40"
                              >
                                Send
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSuggestingGroupId(null); setSelectedSuggestTarget(""); }}
                                className="px-3 py-1.5 bg-white border border-gray-250 text-gray-505 hover:text-gray-805 text-[11px] font-bold rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => handleApproveGroup(g.batchId, g.groupId)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center">
                                <Check className="w-3.5 h-3.5 mr-1" /> Approve Group
                              </button>
                              <button onClick={() => setSuggestingGroupId(g.groupId)} className="bg-white border border-gray-250 hover:bg-gray-50 text-gray-855 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center">
                                <X className="w-3.5 h-3.5 mr-1" /> Suggest Existing Group
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data.assignedBatches?.length > 1 && (
                <div className="flex items-center gap-2 bg-white/40 p-4 border border-white/60 rounded-2xl max-w-sm">
                  <span className="text-xs font-bold text-gray-555">Select Cohort:</span>
                  <select
                    value={selectedManageBatchId || data.assignedBatches[0]?._id || ""}
                    onChange={(e) => setSelectedManageBatchId(e.target.value)}
                    className="p-2 bg-white border border-gray-250 rounded-xl text-xs text-gray-900 font-bold outline-none flex-1"
                  >
                    {data.assignedBatches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <GroupManager
                orgId={activeOrg._id}
                batchId={selectedManageBatchId || data.assignedBatches[0]?._id}
                onRefresh={() => fetchGroupProposals(data.assignedBatches)}
              />
            </div>
          )}
        </div>
      )}

      {/* SUPPORT TICKETS TAB */}
      {activeTab === "support" && (
        <div className="space-y-6 animate-fadeIn">
          {!selectedSupportTicket ? (
            // ── All Tickets List ────────────────────────────────────
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-gray-955 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-blue-600" /> Support Inbox</h3>
                  <p className="text-xs text-gray-500 mt-0.5">All student support tickets from your organization.</p>
                </div>
                <button onClick={fetchAllSupportTickets} className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {supportLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : supportTickets.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-400 font-semibold">No support tickets found.</p>
                </div>
              ) : (
                <div className="bg-white/50 rounded-2xl border border-white/60 backdrop-blur-sm shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-500 bg-gray-50/50 uppercase tracking-wider">
                        <th className="p-4">#</th>
                        <th className="p-4">Title</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Updated</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80 text-xs">
                      {supportTickets.map(ticket => {
                        const stateColor = ticket.stateName === 'closed'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : ticket.stateName?.includes('pending')
                          ? 'bg-yellow-50 text-yellow-750 border-yellow-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100';
                        return (
                          <tr key={ticket.id} className="hover:bg-blue-50/20 transition">
                            <td className="p-4 font-mono text-gray-400">#{ticket.number}</td>
                            <td className="p-4 font-semibold text-gray-900 max-w-xs truncate">{ticket.title}</td>
                            <td className="p-4 text-gray-500 font-mono text-[11px]">{ticket.customer || '—'}</td>
                            <td className="p-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${stateColor}`}>
                                {ticket.stateName || 'open'}
                              </span>
                            </td>
                            <td className="p-4 text-right text-gray-400 font-mono">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : '—'}</td>
                            <td className="p-4">
                              <button
                                onClick={() => handleOpenSupportTicket(ticket)}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                              >
                                Open <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            // ── Ticket Conversation (Staff) ─────────────────────────
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedSupportTicket(null); setSupportArticles([]); }}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 rotate-180" />
                </button>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-gray-950 truncate">{selectedSupportTicket.title}</h5>
                  <p className="text-[10px] text-gray-400 font-mono">Ticket #{selectedSupportTicket.number} • Customer: {selectedSupportTicket.customer || '—'}</p>
                </div>
                {(() => {
                  const c = selectedSupportTicket.stateName === 'closed' ? 'bg-green-50 text-green-700 border-green-100'
                    : selectedSupportTicket.stateName?.includes('pending') ? 'bg-yellow-50 text-yellow-750 border-yellow-100'
                    : 'bg-blue-50 text-blue-700 border-blue-100';
                  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${c}`}>{selectedSupportTicket.stateName || 'open'}</span>;
                })()}
              </div>

              <div className="bg-white/60 border border-white/60 rounded-2xl overflow-hidden flex flex-col shadow-xs" style={{ minHeight: '350px', maxHeight: '500px' }}>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {supportArticlesLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : supportArticles.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-10">No messages in this ticket.</p>
                  ) : (
                    supportArticles.filter(a => !a.internal).map(article => {
                      const isStaff = !article.createdBy?.includes('@') || article.type === 'agent';
                      return (
                        <div key={article.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                          <span className="text-[9px] text-gray-400 font-semibold mb-0.5">{article.createdBy}</span>
                          <div
                            className={`p-3 max-w-[80%] text-xs rounded-2xl leading-relaxed ${
                              isStaff ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'
                            }`}
                            dangerouslySetInnerHTML={{ __html: article.body }}
                          />
                          <span className="text-[9px] text-gray-400 mt-0.5">{article.createdAt ? new Date(article.createdAt).toLocaleString() : ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedSupportTicket.stateName !== 'closed' && (
                  <form onSubmit={handleStaffReply} className="p-3 border-t border-gray-150 bg-white flex gap-2 shrink-0">
                    <input
                      type="text"
                      required
                      value={staffReplyBody}
                      onChange={e => setStaffReplyBody(e.target.value)}
                      placeholder="Type your reply to the student..."
                      className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button disabled={sendingStaffReply} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50">
                      {sendingStaffReply ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Workspace Modal */}
      {activeSubmission && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 border border-white/60 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="bg-white/60 p-6 flex justify-between items-center border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-950">Review Workspace: Attempt {activeSubmission.attemptNumber || 1}</h3>
                <p className="text-xs text-gray-400 font-mono">Candidate UID: {activeSubmission.uid}</p>
              </div>
              <button onClick={() => setActiveSubmission(null)} className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-xl transition cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {/* Split panels */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Submission contents */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 border-b md:border-b-0 md:border-r border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted Assets</h4>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-xs text-gray-500 font-mono">Project/File URL</span>
                  <a href={activeSubmission.fileUrl || activeSubmission.link} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 hover:underline break-all mt-1 font-semibold">
                    {activeSubmission.fileUrl || activeSubmission.link}
                  </a>
                </div>
                
                {activeSubmission.comments && (
                  <div>
                    <span className="text-xs text-gray-500 font-mono">Candidate Comments</span>
                    <p className="text-sm bg-white/80 p-4 border border-gray-100 rounded-xl mt-1 text-gray-700 whitespace-pre-wrap leading-relaxed shadow-2xs">
                      {activeSubmission.comments}
                    </p>
                  </div>
                )}
              </div>

              {/* Evaluation Editor Form */}
              <form onSubmit={handleSubmitReview} className="w-full md:w-96 p-6 overflow-y-auto bg-gray-50/50 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Review Configuration</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Select Status</label>
                    <select value={reviewForm.status} onChange={(e) => setReviewForm(prev => ({ ...prev, status: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer">
                      <option value="approved">Approve Submission</option>
                      <option value="changes_requested">Request Changes</option>
                      <option value="rejected">Reject Submission</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Grade Value (e.g. A+, 9.0)</label>
                    <input type="text" value={reviewForm.grade} onChange={(e) => setReviewForm(prev => ({ ...prev, grade: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" placeholder="A+" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Feedback / Comments</label>
                    <textarea required={reviewForm.status === "changes_requested"} value={reviewForm.feedback} onChange={(e) => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 h-28 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" placeholder="Provide constructive criticism..." />
                  </div>
                </div>

                <div className="pt-6 flex gap-2">
                  <button type="button" onClick={() => setActiveSubmission(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer">
                    Cancel
                  </button>
                  <button disabled={submittingReview} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 cursor-pointer">
                    {submittingReview ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Commit Review"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 text-center">
            <h3 className="text-base font-extrabold text-gray-950">{alertModal.title}</h3>
            <p className="text-xs text-gray-550 leading-relaxed">{alertModal.message}</p>
            <button
              type="button"
              onClick={() => setAlertModal({ isOpen: false, title: "", message: "" })}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 text-center">
            <h3 className="text-base font-extrabold text-gray-955">{confirmModal.title}</h3>
            <p className="text-xs text-gray-550 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null })}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 font-bold text-xs rounded-xl transition cursor-pointer border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConf = confirmModal.onConfirm;
                  setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null });
                  if (onConf) onConf();
                }}
                className="flex-1 py-2.5 bg-blue-650 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
