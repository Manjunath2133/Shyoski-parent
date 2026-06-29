import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, X, Copy, Check, Send, Video, Link2, ShieldCheck } from 'lucide-react';

export default function TeamViewModal({ groupId, weekNumber, onClose, onRefresh }) {
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Submission State (Restored)
  const [submissionLink, setSubmissionLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Video Call State
  const [showVideo, setShowVideo] = useState(false);

  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);

  // Fetch Team & Messages
  useEffect(() => {
    async function loadData() {
      try {
        const { API_URL } = await import('../api');
        const resTeam = await fetch(`${API_URL}/groups/${groupId}`);
        const dataTeam = await resTeam.json();
        setTeam(dataTeam);

        const resMsg = await fetch(`${API_URL}/groups/${groupId}/messages`);
        const dataMsg = await resMsg.json();
        setMessages(dataMsg);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const fetchMessages = async () => {
      const { API_URL } = await import('../api');
      try {
        const res = await fetch(`${API_URL}/groups/${groupId}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (e) { console.error(e); }
    };

    const interval = setInterval(fetchMessages, 5000);

    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMsg = { senderId: currentUser.uid, senderName: "Me", text: newMessage, timestamp: new Date() };
    setMessages([...messages, tempMsg]);
    setNewMessage("");

    const { API_URL } = await import('../api');
    await fetch(`${API_URL}/groups/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            groupId,
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Teammate",
            message: tempMsg.text
        })
    });
  }

  // SUBMISSION LOGIC (Restored)
  async function handleGroupSubmit(e) {
    e.preventDefault();
    if (!submissionLink) return;
    setSubmitting(true);

    try {
      const { API_URL } = await import('../api');
      await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          weekNumber: weekNumber,
          link: submissionLink,
          type: 'group' 
        })
      });
      alert("Group Project Submitted Successfully!");
      onRefresh(); // Refresh Dashboard to show "Submitted"
      onClose();   // Close Modal
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function copyId() {
    navigator.clipboard.writeText(groupId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 text-white">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden h-[85vh] flex backdrop-blur-md border border-white/60">
        
        {/* LEFT SIDE: INFO, MEMBERS & SUBMISSION */}
        <div className="w-1/3 bg-gray-50/80 border-r border-gray-100 flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white/60">
                <h2 className="text-xl font-bold text-gray-950">{team.name}</h2>
                <div onClick={copyId} className="mt-2 inline-flex items-center px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-mono cursor-pointer hover:bg-blue-100 transition text-blue-700">
                    {team.groupId} {copied ? <Check className="w-3 h-3 ml-2 text-green-600"/> : <Copy className="w-3 h-3 ml-2 text-blue-500"/>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Member List */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Squad Members</h3>
                    <div className="space-y-3">
                        {team.memberDetails?.map((m, i) => (
                            <div key={i} className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-2xs border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                    {m.displayName.charAt(0)}
                                </div>
                                <div className="text-sm font-medium text-gray-700">{m.displayName}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center"><Link2 className="w-4 h-4 mr-2"/> Instructions</h3>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        1. Create a GitHub Repo.<br/>
                        2. Add teammates as Collaborators.<br/>
                        3. Submit the Repo Link below.
                    </p>
                </div>

                {/* SUBMISSION FORM (Restored) */}
                <div className="bg-white/80 p-4 rounded-xl border border-gray-100 shadow-2xs">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2 text-blue-600"/> Submit Work
                    </h3>
                    <form onSubmit={handleGroupSubmit}>
                        <input 
                            type="url" required
                            placeholder="https://github.com/..."
                            className="w-full p-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none mb-3 bg-white"
                            value={submissionLink}
                            onChange={(e) => setSubmissionLink(e.target.value)}
                        />
                        <button disabled={submitting} className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-blue-500 transition-all shadow-md cursor-pointer disabled:opacity-50">
                            {submitting ? "Sending..." : "Submit for Team"}
                        </button>
                    </form>
                </div>

            </div>

            <div className="p-4 border-t border-gray-100 bg-white/60">
                 <button onClick={onClose} className="w-full py-3 text-gray-500 font-bold hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer">
                    Close Workspace
                 </button>
            </div>
        </div>

        {/* RIGHT SIDE: CHAT & VIDEO */}
        <div className="w-2/3 flex flex-col relative bg-gray-50/50">
            {/* Top Bar */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/60 shadow-2xs z-10">
                <div className="font-bold text-gray-700 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    Live Chat
                </div>
                <button 
                    onClick={() => setShowVideo(!showVideo)}
                    className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${showVideo ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md'}`}
                >
                    <Video className="w-4 h-4 mr-2"/> {showVideo ? "End Call" : "Video Call"}
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                {showVideo ? (
                    <iframe 
                        src={`https://meet.jit.si/Shyoski_Team_${groupId}#config.prejoinPageEnabled=false`}
                        className="w-full h-full"
                        allow="camera; microphone; fullscreen; display-capture"
                        title="Team Video"
                    ></iframe>
                ) : (
                    <div className="absolute inset-0 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 && <div className="text-center text-slate-400 text-sm mt-10 italic">No messages yet. Say hello! 👋</div>}
                        
                        {messages.map((msg, i) => {
                            const isMe = msg.senderId === currentUser.uid;
                            return (
                                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'}`}>
                                        {!isMe && <div className="text-[10px] font-bold text-blue-600 mb-1">{msg.senderName}</div>}
                                        {msg.text}
                                        <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Message Input */}
            {!showVideo && (
                <div className="p-4 bg-white/80 border-t border-gray-100">
                    <form onSubmit={sendMessage} className="flex space-x-2">
                        <input 
                            type="text" 
                            className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm bg-white"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}