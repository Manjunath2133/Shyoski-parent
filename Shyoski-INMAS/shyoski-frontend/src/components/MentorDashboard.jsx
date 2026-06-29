import { useEffect, useState, useRef } from "react";
import { authenticatedFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import {
  Loader2, Users, Layers, MessageSquare, AlertTriangle, Send, RefreshCw, Clock, HelpCircle, ArrowRight
} from "lucide-react";
import GroupManager from "./GroupManager";

export default function MentorDashboard() {
  const { currentUser } = useAuth();
  const { activeOrg } = useTenant();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "" });
  const triggerAlert = (title, message) => setAlertModal({ isOpen: true, title, message });

  // Group & Chat states
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("chat");

  // Support / Help-desk states (mentor view)
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  const [supportArticles, setSupportArticles] = useState([]);
  const [supportArticlesLoading, setSupportArticlesLoading] = useState(false);
  const [mentorReplyBody, setMentorReplyBody] = useState("");
  const [sendingMentorReply, setSendingMentorReply] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!activeOrg) return;
    fetchMentorDashboard();
  }, [activeOrg]);

  // Handle selected batch changes -> load groups
  useEffect(() => {
    if (selectedBatch) {
      fetchBatchGroups();
      setSelectedGroup(null);
      setMessages([]);
    }
  }, [selectedBatch]);

  // Poll chat messages if group selected
  useEffect(() => {
    if (!selectedGroup) return;

    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 5000); // 5s chat polling
    return () => clearInterval(interval);
  }, [selectedGroup]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMentorDashboard() {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/dashboard/mentor?forceReload=true`);
      setData(res);
      if (res.assignedBatches?.length > 0) {
        setSelectedBatch(res.assignedBatches[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const [exportingEvaluations, setExportingEvaluations] = useState(false);

  const handleExportEvaluations = async () => {
    setExportingEvaluations(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/staff/evaluations/export`);
      const evaluations = res.data || [];
      if (evaluations.length === 0) {
        triggerAlert("Information", "No evaluations recorded in this organization yet.");
        return;
      }
      const headers = ["Submission ID", "Cohort Code", "Cohort Name", "Assignment Title", "Week Number", "Type", "Candidate Info", "Submission URL", "Status", "Grade", "Feedback", "Evaluated By", "Evaluation Time"];
      const rows = evaluations.map(e => [
        e.submissionId,
        e.batchCode,
        e.batchName,
        e.assignmentTitle,
        e.weekNumber,
        e.type,
        e.candidate,
        e.submissionLink,
        e.status,
        e.grade,
        e.feedback,
        e.reviewedBy,
        e.reviewedAt
      ]);
      const csvContent = [headers.join(","), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `evaluator_work_history_${activeOrg.slug || activeOrg._id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      triggerAlert("Error", "Failed to export evaluations: " + err.message);
    } finally {
      setExportingEvaluations(false);
    }
  };

  async function fetchBatchGroups() {
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedBatch._id}/groups`);
      setGroups(res.groups || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchChatMessages() {
    if (!selectedGroup) return;
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedBatch._id}/groups/${selectedGroup.groupCode}/messages`);
      setMessages(res.messages || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim() || !selectedGroup) return;
    setSendingMsg(true);
    try {
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedBatch._id}/groups/${selectedGroup.groupCode}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: chatInput })
      });
      if (res.success) {
        setChatInput("");
        fetchChatMessages();
      }
    } catch (err) {
      triggerAlert("Error", "Failed to send message: " + err.message);
    } finally {
      setSendingMsg(false);
    }
  }

  // --- SUPPORT / ZAMMAD MENTOR ACTIONS ---
  async function fetchAllSupportTicketsMentor() {
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

  async function handleOpenSupportTicketMentor(ticket) {
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

  async function handleMentorReply(e) {
    e.preventDefault();
    if (!mentorReplyBody.trim() || !selectedSupportTicket) return;
    setSendingMentorReply(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${selectedSupportTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ body: mentorReplyBody })
      });
      setMentorReplyBody("");
      const res = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/support/tickets/${selectedSupportTicket.id}/articles`);
      setSupportArticles(res.articles || []);
    } catch (err) {
      triggerAlert("Error", err.message || "Failed to send reply.");
    } finally {
      setSendingMentorReply(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-900">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" />
        <p className="text-gray-500 text-xs font-semibold">Aggregating cohort statistics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-gray-400 text-xs font-semibold">
        Failed to load mentor dashboard metadata.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 min-h-[600px] animate-fadeIn">
      {/* Left Columns: Stats & Batches selection */}
      <div className="xl:col-span-2 space-y-6">
        {/* Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/40 p-5 rounded-2xl border border-white/60 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-650"><Layers className="w-6 h-6" /></div>
            <div>
              <span className="text-xs text-gray-555 font-semibold block">Assigned Batches</span>
              <span className="text-2xl font-extrabold text-gray-900">{data.summary.assignedBatchesCount}</span>
            </div>
          </div>
          <div className="bg-white/40 p-5 rounded-2xl border border-white/60 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-purple-650"><Users className="w-6 h-6" /></div>
            <div>
              <span className="text-xs text-gray-555 font-semibold block">Enrolled Students</span>
              <span className="text-2xl font-extrabold text-gray-900">{data.summary.activeStudentCounts}</span>
            </div>
          </div>
          <div className="bg-white/40 p-5 rounded-2xl border border-red-100 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-650"><AlertTriangle className="w-6 h-6" /></div>
            <div>
              <span className="text-xs text-gray-555 font-semibold block">At-Risk Students</span>
              <span className="text-2xl font-extrabold text-red-600">{data.summary.atRiskStudents}</span>
            </div>
          </div>
        </div>

        {/* Assigned Batch selector list */}
        <div className="bg-white/40 rounded-2xl border border-white/60 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-950">Assigned Cohorts</h3>
            <button
              onClick={handleExportEvaluations}
              disabled={exportingEvaluations}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              {exportingEvaluations ? "Exporting..." : "Export Evaluations (CSV)"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.assignedBatches.map(b => (
              <button key={b._id} onClick={() => setSelectedBatch(b)} className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition cursor-pointer ${selectedBatch?._id === b._id ? "bg-blue-600 text-white shadow-xs" : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"}`}>
                {b.name} ({b.batchCode})
              </button>
            ))}
          </div>
        </div>

        {/* Selected Batch Progress Summary */}
        {selectedBatch && (
          <div className="bg-white/40 rounded-2xl border border-white/60 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-950 flex items-center justify-between">
              <span>{selectedBatch.name} Progress Status</span>
              <span className="text-xs font-mono text-gray-400">{selectedBatch.batchCode}</span>
            </h3>
            {data.batchProgressSummaries
              .filter(bps => bps.batchId === selectedBatch._id)
              .map(bps => (
                <div key={bps.batchId} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/60 border border-gray-150 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-bold block">Active</span>
                    <strong className="text-lg text-gray-900 mt-1 block">{bps.metrics.activeStudents}</strong>
                  </div>
                  <div className="p-4 bg-white/60 border border-gray-150 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-bold block">Certified</span>
                    <strong className="text-lg text-green-600 mt-1 block">{bps.metrics.completedStudents}</strong>
                  </div>
                  <div className="p-4 bg-white/60 border border-gray-150 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-bold block">Groups</span>
                    <strong className="text-lg text-purple-650 mt-1 block">{bps.metrics.groupsCount}</strong>
                  </div>
                  <div className="p-4 bg-white/60 border border-gray-150 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-mono font-bold block">Submissions</span>
                    <strong className="text-lg text-blue-600 mt-1 block">{bps.metrics.totalSubmissions}</strong>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Right Column: Group selector & Chat Rooms / Management */}
      <div className="bg-white/40 rounded-3xl border border-white/60 overflow-hidden flex flex-col min-h-[500px] shadow-sm text-left">
        {/* Header selection */}
        <div className="p-4 bg-white/60 border-b border-gray-200/50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-gray-955 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-blue-600" /> Collaboration Hub
            </h4>
            {selectedGroup && rightPanelTab === "chat" && (
              <button onClick={() => setSelectedGroup(null)} className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer">
                Back to Groups
              </button>
            )}
          </div>

          <div className="flex gap-4 border-b border-gray-200/30">
            <button
              onClick={() => setRightPanelTab("chat")}
              className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition ${rightPanelTab === "chat" ? "border-blue-600 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              Chat Rooms
            </button>
            <button
              onClick={() => setRightPanelTab("manage")}
              className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition ${rightPanelTab === "manage" ? "border-blue-600 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              Group Administration
            </button>
            <button
              onClick={() => { setRightPanelTab("support"); fetchAllSupportTicketsMentor(); }}
              className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition flex items-center gap-1 ${rightPanelTab === "support" ? "border-blue-600 text-blue-650" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              <HelpCircle className="w-3 h-3" /> Support
            </button>
          </div>
        </div>

        {/* Panel content */}
        {rightPanelTab === "chat" ? (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {!selectedGroup ? (
              /* Group selector list */
              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {groups.length === 0 ? (
                  <div className="p-20 text-center text-gray-400 text-xs font-semibold">No active groups in this cohort batch.</div>
                ) : (
                  groups.map(g => (
                    <div key={g._id} onClick={async () => {
                      const details = await authenticatedFetch(`/api/v2/organizations/${activeOrg._id}/batches/${selectedBatch._id}/groups/${g.groupCode}`);
                      setSelectedGroup(details.group);
                    }} className="p-4 bg-white/60 border border-white/80 hover:border-gray-250 hover:shadow-xs rounded-2xl cursor-pointer transition flex justify-between items-center">
                      <div>
                        <h5 className="font-bold text-gray-800 text-xs">{g.name}</h5>
                        <span className="text-[10px] font-mono text-gray-400">Code: {g.groupCode}</span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 flex items-center bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                        {g.members?.length || 0} Members <Send className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Actual Chat UI */
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white/30">
                <div className="p-3 bg-white/60 border-b border-gray-250/30 text-xs flex justify-between items-center shrink-0">
                  <div>
                    <strong className="text-gray-800 block text-xs">{selectedGroup.name}</strong>
                    <span className="text-gray-400 font-mono text-[9px]">Repo: {selectedGroup.repoUrl || "No Repository Configured"}</span>
                  </div>
                  <button onClick={fetchChatMessages} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chat Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-20 text-xs font-mono">No chat logs recorded. Drop a message to start!</p>
                  ) : (
                    messages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col space-y-1 ${m.senderId === currentUser.uid ? "items-end" : "items-start"}`}>
                        <div className="flex items-center space-x-2 text-[9px] text-gray-400 font-mono font-bold">
                          <span>{m.senderName}</span>
                          <span>•</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={`p-3 max-w-[80%] text-xs font-medium rounded-2xl ${m.senderId === currentUser.uid ? "bg-blue-50 border border-blue-200 text-black rounded-tr-none" : "bg-white border border-gray-200 text-black rounded-tl-none shadow-2xs"}`}>
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-150 bg-white/60 flex gap-2 shrink-0">
                  <input type="text" required value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-855 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button disabled={sendingMsg} className="bg-blue-650 hover:bg-blue-600 text-white font-bold p-2 rounded-xl flex items-center justify-center transition disabled:opacity-50 cursor-pointer">
                    {sendingMsg ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 flex-1 overflow-y-auto">
            {selectedBatch ? (
              <GroupManager
                orgId={activeOrg._id}
                batchId={selectedBatch._id}
                onRefresh={fetchBatchGroups}
              />
            ) : (
              <p className="text-gray-500 text-xs text-center font-medium">Please select a cohort batch to manage groups.</p>
            )}
          </div>
        )}
        {rightPanelTab === "support" && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {!selectedSupportTicket ? (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-955 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-blue-600" /> Student Support Tickets</h4>
                  <button onClick={fetchAllSupportTicketsMentor} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer transition"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
                {supportLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : supportTickets.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8 font-semibold">No support tickets found.</p>
                ) : (
                  <div className="space-y-2">
                    {supportTickets.map(ticket => {
                      const sc = ticket.stateName === 'closed' ? 'bg-green-50 text-green-700 border-green-100'
                        : ticket.stateName?.includes('pending') ? 'bg-yellow-50 text-yellow-750 border-yellow-100'
                        : 'bg-blue-50 text-blue-700 border-blue-100';
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => handleOpenSupportTicketMentor(ticket)}
                          className="p-3 bg-white/60 border border-gray-150 rounded-xl hover:shadow-xs transition cursor-pointer flex justify-between items-center group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-650 transition">{ticket.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{ticket.number} • {ticket.customer || '—'}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ml-2 shrink-0 ${sc}`}>{ticket.stateName || 'open'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3 h-full flex flex-col">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedSupportTicket(null); setSupportArticles([]); }} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg cursor-pointer"><RefreshCw className="w-3.5 h-3.5 rotate-180" /></button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{selectedSupportTicket.title}</p>
                    <p className="text-[9px] text-gray-400 font-mono">#{selectedSupportTicket.number}</p>
                  </div>
                </div>
                <div className="flex-1 bg-white/60 border border-gray-150 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: '250px' }}>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {supportArticlesLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-500 w-4 h-4" /></div>
                    ) : supportArticles.filter(a => !a.internal).map(article => {
                      const isStaff = !article.createdBy?.includes('@') || article.type === 'agent';
                      return (
                        <div key={article.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                          <span className="text-[9px] text-gray-400 mb-0.5">{article.createdBy}</span>
                          <div
                            className={`p-2.5 max-w-[85%] text-xs rounded-xl leading-relaxed ${
                              isStaff ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'
                            }`}
                            dangerouslySetInnerHTML={{ __html: article.body }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {selectedSupportTicket.stateName !== 'closed' && (
                    <form onSubmit={handleMentorReply} className="p-2 border-t border-gray-150 bg-white flex gap-2 shrink-0">
                      <input
                        type="text"
                        required
                        value={mentorReplyBody}
                        onChange={e => setMentorReplyBody(e.target.value)}
                        placeholder="Reply..."
                        className="flex-1 p-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 outline-none focus:ring-1 focus:ring-blue-200"
                      />
                      <button disabled={sendingMentorReply} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50">
                        {sendingMentorReply ? <Loader2 className="animate-spin w-3 h-3" /> : <Send className="w-3 h-3" />}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 text-center">
            <h3 className="text-base font-extrabold text-gray-955">{alertModal.title}</h3>
            <p className="text-xs text-gray-550 leading-relaxed">{alertModal.message}</p>
            <button
              type="button"
              onClick={() => setAlertModal({ isOpen: false, title: "", message: "" })}
              className="w-full py-2.5 bg-blue-650 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
