import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";
import { fetchBookings, fetchLawyers, fetchMessages, uploadDocument } from "@/lib/dataService";
import { socket } from "@/lib/socketClient";
import { 
  ArrowLeft, 
  Send, 
  Search, 
  MoreVertical, 
  CheckCheck, 
  Paperclip, 
  MessageSquare, 
  Trash2, 
  Flag,
  UserCircle,
  X,
  Download,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const getFallbackAvatar = (name) => `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=0066ff&fontFamily=Arial&fontWeight=bold`;

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(location.state?.partnerId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const currentUserId = useMemo(() => {
    const id = currentUser?.id || currentUser?._id;
    return id ? String(id) : "";
  }, [currentUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.state?.partnerId) {
      setSelectedPartnerId(String(location.state.partnerId));
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [m, l, b] = await Promise.all([fetchMessages(), fetchLawyers(), fetchBookings()]);
        if (isMounted) {
          setMessages(m || []);
          setLawyers(l || []);
          setBookings(b || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const conversationPartners = useMemo(() => {
    if (!currentUser) return [];
    const partners = new Map();

    bookings.filter(b => b.status !== "cancelled").forEach(b => {
      if (currentUser.role === "lawyer") {
        const pId = String(b.clientId);
        partners.set(pId, { 
          id: pId, 
          name: b.clientName, 
          profileId: pId, 
          avatar: b.clientAvatar || getFallbackAvatar(b.clientName)
        });
      } else {
        const lawyer = lawyers.find(l => String(l.id) === String(b.lawyerId));
        if (lawyer) {
          const pId = String(lawyer.id);
          partners.set(pId, { 
            id: pId, 
            name: lawyer.name, 
            profileId: String(lawyer.id), 
            avatar: lawyer.avatar || b.lawyerAvatar || getFallbackAvatar(lawyer.name)
          });
        }
      }
    });

    messages.forEach(msg => {
      const sId = String(msg.senderId);
      const rId = String(msg.receiverId);
      const pId = sId === currentUserId ? rId : sId;
      if (!partners.has(pId)) {
        partners.set(pId, { id: pId, name: sId === currentUserId ? "Contact" : (msg.senderName || "Lawyer"), profileId: pId, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pId}` });
      }
    });

    let list = Array.from(partners.values());
    if (location.state?.partnerId && !partners.has(String(location.state.partnerId))) {
      const pId = String(location.state.partnerId);
      const lawyer = lawyers.find(l => String(l.id) === pId);
      if (lawyer) {
        list.push({ id: pId, name: lawyer.name, profileId: String(lawyer.id), avatar: lawyer.avatar });
      }
    }

    return list.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [bookings, lawyers, messages, currentUserId, searchQuery, location.state]);

  const activePartner = useMemo(() => {
    const pId = selectedPartnerId ? String(selectedPartnerId) : null;
    if (pId) {
      const found = conversationPartners.find(p => String(p.id) === pId);
      if (found) return found;
      // If we have a selected ID but haven't found it in partners yet (e.g. data loading), 
      // don't jump to conversationPartners[0] yet.
      return null; 
    }
    return conversationPartners[0] || null;
  }, [selectedPartnerId, conversationPartners]);

  const conversationMessages = useMemo(() => {
    if (!activePartner) return [];
    const pId = String(activePartner.id);
    return messages.filter(msg => String(msg.senderId) === pId || String(msg.receiverId) === pId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages, activePartner]);

  const activeBooking = useMemo(() => {
    if (!activePartner) return null;
    const profId = String(activePartner.profileId);
    return bookings.find(b => (String(b.clientId) === profId || String(b.lawyerId) === profId) && b.status !== "cancelled");
  }, [activePartner, bookings]);

  // 1. Core messaging socket connection and receive_message hook
  useEffect(() => {
    if (!currentUserId) return;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join", currentUserId);

    const onMessage = (m) => {
      console.log("[SOCKET] Received message:", m);
      setMessages(prev => {
        const isDup = prev.some(x => 
          (x._id && String(x._id) === String(m._id)) || 
          (m.tempId && String(x._id) === String(m.tempId))
        );
        if (isDup) {
          return prev.map(x => (String(x._id) === String(m._id) || (m.tempId && String(x._id) === String(m.tempId))) ? m : x);
        }
        return [...prev, m];
      });
    };

    socket.on("receive_message", onMessage);
    return () => {
      socket.off("receive_message", onMessage);
    };
  }, [currentUserId]);

  // 2. Active partner status and typing events hook
  useEffect(() => {
    if (!currentUserId || !activePartner) {
      setIsOnline(false);
      setIsTyping(false);
      return;
    }

    socket.emit("check_status", activePartner.id, (res) => setIsOnline(res.status === "online"));

    const handleUserStatus = ({ userId, status }) => {
      if (String(userId) === String(activePartner.id)) {
        setIsOnline(status === "online");
      }
    };
    const handleUserTyping = ({ userId }) => {
      if (String(userId) === String(activePartner.id)) {
        setIsTyping(true);
      }
    };
    const handleUserStoppedTyping = ({ userId }) => {
      if (String(userId) === String(activePartner.id)) {
        setIsTyping(false);
      }
    };

    socket.on("user_status", handleUserStatus);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);

    return () => {
      socket.off("user_status", handleUserStatus);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
    };
  }, [currentUserId, activePartner]);

  const handleDownload = (url, filename) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename || "document");
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSend = (attachmentData = null) => {
    if ((!message.trim() && !attachmentData) || !activePartner || !activeBooking) return;
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const payload = { 
      receiverId: String(activePartner.id), 
      content: attachmentData ? (message.trim() || `Shared an attachment: ${attachmentData.name}`) : message.trim(), 
      senderName: currentUser.name, 
      bookingId: String(activeBooking.id), 
      timestamp: now,
      attachment: attachmentData,
      tempId: tempId
    };
    
    const temp = { 
      _id: tempId, 
      senderId: currentUserId, 
      receiverId: payload.receiverId, 
      content: payload.content, 
      timestamp: now, 
      senderName: currentUser.name,
      attachment: attachmentData
    };
    
    setMessages(prev => [...prev, temp]);
    socket.emit("send_message", payload, (res) => !res.success && setMessages(prev => prev.filter(x => x._id !== temp._id)));
    
    if (!attachmentData) {
      setMessage("");
      socket.emit("stop_typing", { to: activePartner.id });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadDocument(file);
      
      if (res && res.url) {
        handleSend({
          name: file.name,
          url: res.url,
          size: file.size,
          type: file.type
        });
        toast.success("File uploaded successfully.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearChat = () => {
    toast.info("Chat history cleared locally.");
    setMessages(prev => prev.filter(m => String(m.senderId) !== String(activePartner.id) && String(m.receiverId) !== String(activePartner.id)));
    setShowMenu(false);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white italic">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-1 flex border border-white/10 rounded-2xl bg-[#1e293b] shadow-2xl overflow-hidden relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          {/* Sidebar */}
          <div className={cn(
            "w-full sm:w-[320px] border-r border-white/10 flex flex-col bg-[#0f172a]/20 z-10 transition-all duration-300",
            selectedPartnerId && "hidden sm:flex"
          )}>
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3 mb-4 px-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => navigate(getDashboardPath(currentUser?.role))}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="font-bold text-white text-lg">Inbox</h1>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Search..." className="pl-10 bg-white/5 border-white/10 text-white rounded-xl h-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {conversationPartners.map((p) => (
                <button key={p.id} onClick={() => setSelectedPartnerId(p.id)} className={cn("w-full flex items-center gap-4 p-3.5 rounded-xl mb-1 transition-all", activePartner?.id === p.id ? "bg-blue-600 shadow-md" : "hover:bg-white/5")}>
                  <Avatar className="h-11 w-11 border border-white/10">
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback>{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">Consultation Active</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className={cn(
            "flex-1 flex flex-col bg-[#1e293b] relative",
            !selectedPartnerId && "hidden sm:flex"
          )}>
            {activePartner ? (
              <>
                <header className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1e293b]/50 z-20">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white sm:hidden" 
                      onClick={() => setSelectedPartnerId(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={activePartner.avatar} />
                        <AvatarFallback>{activePartner.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1e293b]", isOnline ? "bg-green-500" : "bg-slate-500")} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{activePartner.name}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{isOnline ? "Online" : "Offline"}</p>
                    </div>
                  </div>
                  
                  <div className="relative" ref={menuRef}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("text-slate-500 hover:text-white rounded-full", showMenu && "bg-white/10 text-white")}
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>

                    {/* CUSTOM SIMPLE DROPDOWN */}
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#1e293b] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-100">
                        <div className="p-2 border-b border-white/5 px-4 py-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Chat Options</span>
                          <X className="h-3 w-3 text-slate-500 cursor-pointer hover:text-white" onClick={() => setShowMenu(false)} />
                        </div>
                        <div className="p-1">
                          <button 
                            onClick={() => navigate(currentUser?.role === 'lawyer' ? `/client/${activePartner.id}` : `/lawyer/${activePartner.profileId}`)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 rounded-lg transition-colors"
                          >
                            <UserCircle className="h-4 w-4" />
                            <span>View Profile</span>
                          </button>
                          <button 
                            onClick={handleClearChat}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Clear Local History</span>
                          </button>
                          <div className="h-px bg-white/5 my-1" />
                          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:bg-white/5 rounded-lg transition-colors">
                            <Flag className="h-4 w-4" />
                            <span>Report User</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#0f172a]/5">
                  {conversationMessages.length > 0 ? (
                    conversationMessages.map((msg, i) => {
                      const isMe = String(msg.senderId) === currentUserId;
                      return (
                        <div key={msg._id || i} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl shadow-md text-[13px] relative",
                            isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-700 text-white rounded-tl-none border border-white/5"
                          )}>
                            {msg.attachment && (
                              <div className="mb-3 p-3 bg-white/10 rounded-xl border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-colors"
                                onClick={() => handleDownload(msg.attachment.url, msg.attachment.name)}>
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <Paperclip className="h-4 w-4 text-blue-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-[11px] truncate">{msg.attachment.name}</p>
                                  <p className="text-[9px] opacity-60">
                                    {msg.attachment.size ? `${(msg.attachment.size / 1024).toFixed(1)} KB` : "Document"}
                                  </p>
                                </div>
                                <Download className="h-4 w-4 opacity-40" />
                              </div>
                            )}
                            <p className="leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-2 opacity-50">
                              <span className="text-[10px] font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && <CheckCheck className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-20 py-20">
                      <MessageSquare className="h-20 w-20 mb-3" />
                      <p className="text-base font-bold italic">No messages yet</p>
                    </div>
                  )}
                  {isTyping && (
                    <div className="text-[10px] text-blue-400 font-bold animate-pulse flex items-center gap-2 italic">
                      <div className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
                      Typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <footer className="p-4 sm:p-6 border-t border-white/10 bg-[#1e293b]">
                  {activeBooking ? (
                    <div className="flex items-center gap-2 sm:gap-3 max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-4 py-1.5 shadow-inner">
                      <button 
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Paperclip className="h-5 w-5" />
                        )}
                      </button>
                      <Input 
                        placeholder="Type a message..." 
                        className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white h-10 sm:h-12 text-[13px] sm:text-sm placeholder:text-slate-500"
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          socket.emit("typing", { to: activePartner.id });
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      />
                      <button 
                        onClick={() => handleSend()} 
                        disabled={!message.trim() && !isUploading} 
                        className="p-2 text-blue-500 hover:text-blue-400 active:scale-90 transition-transform disabled:opacity-30"
                      >
                        <Send className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                      Consultation Booking Required
                    </div>
                  )}
                </footer>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-700 py-20">
                <MessageSquare className="h-12 w-12 opacity-10 mb-4" />
                <p className="text-lg font-bold">Select a chat to begin</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Messages;
