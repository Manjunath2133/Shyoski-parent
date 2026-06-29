import { useState, useEffect } from "react";
import { authenticatedFetch } from "../api";
import {
  Loader2, Plus, Trash2, Edit2, UserPlus, X, Save, Link2, AlertCircle, Check
} from "lucide-react";

export default function GroupManager({ orgId, batchId, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  // Create group state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSize, setNewGroupSize] = useState(4);
  const [creating, setCreating] = useState(false);

  // Edit group state (inline rename / repo update)
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRepoUrl, setEditRepoUrl] = useState("");
  const [editMaxMembers, setEditMaxMembers] = useState(4);
  const [savingEdit, setSavingEdit] = useState(false);

  // Add member state
  const [addingToGroupId, setAddingToGroupId] = useState(null);
  const [selectedStudentUid, setSelectedStudentUid] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Join Requests state
  const [joinRequests, setJoinRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  useEffect(() => {
    if (orgId && batchId) {
      loadData();
    }
  }, [orgId, batchId]);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsRes, studentsRes, joinRequestsRes] = await Promise.all([
        authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/groups`),
        authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/enrollments?limit=100`),
        authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/join-requests`)
      ]);
      setGroups(groupsRes.groups || []);
      setStudents(studentsRes.data || []);
      setJoinRequests(joinRequestsRes.requests || []);
    } catch (e) {
      console.error("Failed to load group manager data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveJoinRequest(requestId) {
    setProcessingRequestId(requestId);
    try {
      await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/join-requests/${requestId}/approve`, {
        method: "POST"
      });
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to approve request");
    } finally {
      setProcessingRequestId(null);
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

  async function handleRejectJoinRequest(requestId) {
    triggerConfirm(
      "Reject Join Request",
      "Are you sure you want to reject this join request?",
      async () => {
        setProcessingRequestId(requestId);
        try {
          await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/join-requests/${requestId}/reject`, {
            method: "POST"
          });
          await loadData();
          if (onRefresh) onRefresh();
        } catch (err) {
          alert(err.message || "Failed to reject request");
        } finally {
          setProcessingRequestId(null);
        }
      }
    );
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups`, {
        method: "POST",
        body: JSON.stringify({ name: newGroupName.trim(), maxMembers: newGroupSize })
      });
      setNewGroupName("");
      setNewGroupSize(4);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateGroup(groupId) {
    setSavingEdit(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), repoUrl: editRepoUrl.trim(), maxMembers: editMaxMembers })
      });
      setEditingGroupId(null);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to update group");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteGroup(groupId, name) {
    triggerConfirm(
      "Delete Cohort Team",
      `Are you sure you want to delete the group "${name}"? All members will be removed.`,
      async () => {
        try {
          await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/${groupId}`, {
            method: "DELETE"
          });
          await loadData();
          if (onRefresh) onRefresh();
        } catch (err) {
          alert(err.message || "Failed to delete group");
        }
      }
    );
  }

  async function handleAddMember(groupId) {
    if (!selectedStudentUid) return;
    setAddingMember(true);
    try {
      await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ uid: selectedStudentUid })
      });
      setSelectedStudentUid("");
      setAddingToGroupId(null);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(groupId, studentUid, studentName) {
    triggerConfirm(
      "Remove Team Member",
      `Are you sure you want to remove ${studentName} from this group?`,
      async () => {
        try {
          await authenticatedFetch(`/api/v2/organizations/${orgId}/batches/${batchId}/staff/groups/${groupId}/members/${studentUid}`, {
            method: "DELETE"
          });
          await loadData();
          if (onRefresh) onRefresh();
        } catch (err) {
          alert(err.message || "Failed to remove member");
        }
      }
    );
  }

  function startEdit(group) {
    setEditingGroupId(group.groupId);
    setEditName(group.name);
    setEditRepoUrl(group.repoUrl || "");
    setEditMaxMembers(group.maxMembers || 4);
  }

  // Get active student candidates (active status students who are not in the current group)
  function getCandidateStudents(group) {
    return students.filter(s => s.status === 'active' && !group.members?.includes(s.uid));
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  const activeGroups = groups.filter(g => g.status === 'active');

  return (
    <div className="space-y-6 text-left">
      {/* Create Team Card */}
      <div className="bg-white/60 border border-white/60 p-5 rounded-2xl shadow-xs">
        <h4 className="text-sm font-bold text-gray-955 mb-3 flex items-center">
          <Plus className="w-4 h-4 mr-1.5 text-blue-650" /> Create Cohort Team
        </h4>
        <form onSubmit={handleCreateGroup} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Team Name</label>
            <input
              type="text"
              required
              placeholder="E.g., Team Alpha, Spatial Project"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-250 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-105"
            />
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Group Size Limit</label>
            <input
              type="number"
              required
              min="1"
              max="20"
              value={newGroupSize}
              onChange={(e) => setNewGroupSize(parseInt(e.target.value) || 4)}
              className="w-full p-2.5 bg-white border border-gray-250 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-105"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center disabled:opacity-50 h-[38px]"
          >
            {creating ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Create Team
          </button>
        </form>
      </div>

      {/* Join Requests Pending Section */}
      {joinRequests.length > 0 && (
        <div className="bg-amber-50/45 border border-amber-200/60 p-5 rounded-2xl shadow-xs space-y-4">
          <h4 className="text-sm font-extrabold text-amber-900 flex items-center">
            <AlertCircle className="w-4.5 h-4.5 mr-1.5 text-amber-600 animate-pulse" /> Pending Group Join Requests ({joinRequests.length})
          </h4>
          <div className="divide-y divide-amber-150/40">
            {joinRequests.map(req => (
              <div key={req._id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900 text-xs">{req.studentName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({req.studentEmail})</span>
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Requests to join: <strong className="text-gray-900">{req.groupName}</strong> (Code: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">{req.groupId}</code>)
                  </div>
                  {req.previousGroupId ? (
                    <div className="text-[10px] text-amber-800 font-semibold bg-amber-100/60 px-2.5 py-1 rounded-lg inline-block border border-amber-200/50">
                      ⚠️ Currently in team: <strong>{req.previousGroupName}</strong> (Code: {req.previousGroupId})
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                      Not currently in any other team
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveJoinRequest(req._id)}
                    disabled={processingRequestId !== null}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl cursor-pointer flex items-center transition"
                  >
                    {processingRequestId === req._id ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectJoinRequest(req._id)}
                    disabled={processingRequestId !== null}
                    className="px-3.5 py-2 bg-white border border-gray-250 hover:bg-gray-50 text-gray-800 text-[11px] font-bold rounded-xl cursor-pointer flex items-center transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-955">Active Teams ({activeGroups.length})</h4>
        {activeGroups.length === 0 ? (
          <p className="text-gray-500 text-xs py-8 text-center font-medium">No active teams created for this cohort yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {activeGroups.map(group => {
              const candidates = getCandidateStudents(group);
              const isEditing = editingGroupId === group.groupId;
              const isAdding = addingToGroupId === group.groupId;

              return (
                <div key={group.groupId} className="bg-white/60 border border-white/60 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-sm transition">
                  <div className="flex justify-between items-start">
                    {isEditing ? (
                      <div className="space-y-2 w-full max-w-md">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Team Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 bg-white border border-gray-250 rounded-lg text-xs text-gray-900 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Git Repository URL</label>
                          <input
                            type="url"
                            value={editRepoUrl}
                            onChange={(e) => setEditRepoUrl(e.target.value)}
                            className="w-full p-2 bg-white border border-gray-250 rounded-lg text-xs text-gray-900 font-mono"
                            placeholder="https://github.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Group Size Limit</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={editMaxMembers}
                            onChange={(e) => setEditMaxMembers(parseInt(e.target.value) || 4)}
                            className="w-full p-2 bg-white border border-gray-250 rounded-lg text-xs text-gray-900 font-semibold"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateGroup(group.groupId)}
                            disabled={savingEdit}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center"
                          >
                            {savingEdit ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingGroupId(null)}
                            className="px-3 py-1.5 bg-white border border-gray-250 text-gray-655 text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-gray-955 text-base">{group.name}</h5>
                          <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-md">Code: {group.groupCode}</span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">Limit: {group.maxMembers || 4} Members</span>
                        </div>
                        {group.repoUrl ? (
                          <a
                            href={group.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center mt-1 font-mono"
                          >
                            <Link2 className="w-3.5 h-3.5 mr-1" /> {group.repoUrl}
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-bold flex items-center mt-1"><AlertCircle className="w-3 h-3 mr-1 text-amber-500" /> No Git Repository Connected</span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(group)}
                          className="p-2 bg-white border border-gray-200 hover:bg-gray-55 text-gray-655 hover:text-gray-900 rounded-lg cursor-pointer transition shadow-2xs"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.groupId, group.name)}
                          className="p-2 bg-red-50 border border-red-100 hover:bg-red-100 text-red-655 hover:text-red-750 rounded-lg cursor-pointer transition shadow-2xs"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Members list */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Group Members ({group.members?.length || 0})</span>
                      {!isAdding && (
                        <button
                          onClick={() => setAddingToGroupId(group.groupId)}
                          className="text-[11px] font-bold text-blue-650 hover:text-blue-700 flex items-center cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
                        </button>
                      )}
                    </div>

                    {isAdding && (
                      <div className="flex gap-2 items-center bg-blue-50/50 p-3 border border-blue-100/50 rounded-xl max-w-md">
                        <select
                          value={selectedStudentUid}
                          onChange={(e) => setSelectedStudentUid(e.target.value)}
                          className="flex-1 p-2 bg-white border border-gray-250 rounded-lg text-xs text-gray-900 font-bold outline-none"
                        >
                          <option value="">-- Select Student --</option>
                          {candidates.map(s => (
                            <option key={s.uid} value={s.uid}>{s.displayName} ({s.email})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddMember(group.groupId)}
                          disabled={addingMember || !selectedStudentUid}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center disabled:opacity-40"
                        >
                          {addingMember ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingToGroupId(null); setSelectedStudentUid(""); }}
                          className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {group.members?.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">No members assigned to this group yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.members?.map(uid => {
                          const userObj = students.find(s => s.uid === uid);
                          return (
                            <div key={uid} className="flex justify-between items-center bg-white border border-gray-100 p-2.5 rounded-xl text-xs font-semibold">
                              <div>
                                <span className="text-gray-850 block">{userObj?.displayName || "Loading..."}</span>
                                <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{userObj?.email || uid}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(group.groupId, uid, userObj?.displayName || "this student")}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-655 rounded-lg cursor-pointer"
                                title="Remove Member"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Custom Confirmation Modal */}
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
