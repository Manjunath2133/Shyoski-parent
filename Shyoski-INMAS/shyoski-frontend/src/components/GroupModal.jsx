// import { useState } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { Users, UserPlus, Loader2, X } from 'lucide-react';

// export default function GroupModal({ batchId, onClose, onRefresh }) {
//   const [mode, setMode] = useState('create'); // 'create' or 'join'
//   const [input, setInput] = useState(""); // Group Name or Group ID
//   const [loading, setLoading] = useState(false);
//   const { currentUser } = useAuth();

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setLoading(true);
//     const endpoint = mode === 'create' ? '/groups/create' : '/groups/join';
//     const body = mode === 'create' 
//       ? { uid: currentUser.uid, groupName: input, batchId }
//       : { uid: currentUser.uid, groupId: input }; // Input acts as ID here

//     try {
//       const res = await fetch(`http://localhost:8787${endpoint}`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(body)
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);

//       alert(`Success! You are now part of a group.`);
//       onRefresh(); // Refresh Dashboard to see Group View
//       onClose();
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
//         <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
//           <h3 className="text-xl font-bold">Week 3: Team Formation</h3>
//           <button onClick={onClose}><X className="w-6 h-6 hover:text-purple-200"/></button>
//         </div>

//         <div className="p-6">
//           <p className="text-slate-600 text-sm mb-6">
//             This is a collaborative project. You must either form a new team or join an existing one using their Group ID.
//           </p>

//           <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
//             <button 
//               onClick={() => { setMode('create'); setInput(""); }}
//               className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'create' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-purple-600'}`}
//             >
//               Create New Team
//             </button>
//             <button 
//               onClick={() => { setMode('join'); setInput(""); }}
//               className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'join' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-purple-600'}`}
//             >
//               Join Team
//             </button>
//           </div>

//           <form onSubmit={handleSubmit}>
//             <label className="block text-sm font-medium text-slate-700 mb-2">
//               {mode === 'create' ? "Team Name" : "Enter Group ID (e.g., GRP-1234)"}
//             </label>
//             <div className="relative mb-6">
//               {mode === 'create' ? <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> : <UserPlus className="absolute left-3 top-3 w-5 h-5 text-slate-400" />}
//               <input 
//                 type="text" required
//                 className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
//                 placeholder={mode === 'create' ? "e.g., The Avengers" : "GRP-XXXX"}
//                 value={input} onChange={(e) => setInput(e.target.value)}
//               />
//             </div>

//             <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex justify-center items-center">
//               {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'create' ? "Create Team" : "Join Team")}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }










import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Loader2, X, Search, RefreshCw } from 'lucide-react';

export default function GroupModal({ batchId, onClose, onRefresh }) {
  const [mode, setMode] = useState('browse'); // 'browse' | 'create' | 'join_id'
  const [input, setInput] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  
  const { currentUser } = useAuth();

  // Load available groups when "Browse" mode is active
  useEffect(() => {
    if (mode === 'browse') {
      loadGroups();
    }
  }, [mode]);

  async function loadGroups() {
    try {
      setLoading(true);
      const { API_URL } = await import('../api');
      const res = await fetch(`${API_URL}/groups/available/${batchId}`);
      const data = await res.json();
      setAvailableGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e, specificGroupId = null) {
    if (e) e.preventDefault();
    setLoading(true);

    const targetGroupId = specificGroupId || input;
    const endpoint = mode === 'create' ? '/groups/create' : '/groups/join';
    const body = mode === 'create' 
      ? { uid: currentUser.uid, groupName: input, batchId }
      : { uid: currentUser.uid, groupId: targetGroupId }; 

    try {
      const { API_URL } = await import('../api');
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Success!`);
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden h-[500px] flex flex-col">
        
        {/* Header */}
        <div className="bg-purple-600 p-6 text-white flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold">Find Your Squad</h3>
          <button onClick={onClose}><X className="w-6 h-6 hover:text-purple-200"/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button onClick={() => setMode('browse')} className={`flex-1 py-4 text-sm font-bold ${mode === 'browse' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-slate-500 hover:bg-slate-50'}`}>
            Browse Open Teams
          </button>
          <button onClick={() => setMode('create')} className={`flex-1 py-4 text-sm font-bold ${mode === 'create' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-slate-500 hover:bg-slate-50'}`}>
            Create New Team
          </button>
          <button onClick={() => setMode('join_id')} className={`flex-1 py-4 text-sm font-bold ${mode === 'join_id' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-slate-500 hover:bg-slate-50'}`}>
            Enter Group ID
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* BROWSE MODE */}
          {mode === 'browse' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-slate-500">Teams with vacancies in your batch:</p>
                <button onClick={loadGroups} className="text-purple-600 hover:text-purple-800"><RefreshCw className="w-4 h-4"/></button>
              </div>
              
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600"/></div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-lg">
                  No open teams found. Be a leader and create one!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {availableGroups.map((group) => (
                    <div key={group.groupId} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:border-purple-300 transition-colors">
                      <div>
                        <div className="font-bold text-slate-800">{group.name}</div>
                        <div className="text-xs text-slate-500">ID: {group.groupId} • {group.memberCount}/4 Members</div>
                      </div>
                      <button 
                        onClick={() => handleSubmit(null, group.groupId)}
                        className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-bold rounded-lg hover:bg-purple-200"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE MODE */}
          {mode === 'create' && (
            <div className="max-w-xs mx-auto mt-8">
              <p className="text-sm text-center text-slate-500 mb-6">You will be the Team Lead. Invite up to 3 friends.</p>
              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-700 mb-2">Team Name</label>
                <input 
                  type="text" required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none mb-4"
                  placeholder="e.g., Code Ninjas"
                  value={input} onChange={(e) => setInput(e.target.value)}
                />
                <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex justify-center">
                  {loading ? <Loader2 className="animate-spin" /> : "Create & Start"}
                </button>
              </form>
            </div>
          )}

          {/* JOIN BY ID MODE */}
          {mode === 'join_id' && (
            <div className="max-w-xs mx-auto mt-8">
              <p className="text-sm text-center text-slate-500 mb-6">Enter the ID shared by your friend.</p>
              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-700 mb-2">Group ID</label>
                <input 
                  type="text" required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none mb-4"
                  placeholder="GRP-XXXX"
                  value={input} onChange={(e) => setInput(e.target.value)}
                />
                <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex justify-center">
                  {loading ? <Loader2 className="animate-spin" /> : "Verify & Join"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}