import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Minus, Square, Minimize2, Maximize2, Trash2, History, MessageSquarePlus, Pencil, Sparkles, FileText, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { apiRequest } from "@/lib/apiClient";

export const AIAssistant = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(Date.now());
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your LawConnect AI Assistant. How can I help you with your legal queries today? You can ask legal questions or click below to analyze your case." }
  ]);

  const storageKey = currentUser ? `lawconnect-ai-sessions-${currentUser._id || currentUser.id}` : null;

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setSessions(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse chat history", e);
        }
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (storageKey && messages.length > 1) {
      setSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === sessionId);
        const newSession = { id: sessionId, date: new Date().toISOString(), messages };
        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = newSession;
        } else {
          updated = [newSession, ...prev];
        }
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }
  }, [messages, sessionId, storageKey]);

  const handleClose = () => {
    setIsOpen(false);
    setMessages([{ role: "assistant", content: "Hi! I'm your LawConnect AI Assistant. How can I help you with your legal queries today?" }]);
    setSessionId(Date.now());
    setShowHistory(false);
  };

  const handleNewChat = () => {
    setMessages([{ role: "assistant", content: "Hi! I'm your LawConnect AI Assistant. How can I help you with your legal queries today?" }]);
    setSessionId(Date.now());
    setShowHistory(false);
  };

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isMinimized]);

  if (!currentUser) return null; // Only show for logged in users

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const updatedMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const data = await apiRequest("/ai/chat", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ history: updatedMessages })
      });
      
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error(error);
      toast.error("AI is currently unavailable.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseAnalysis = async () => {
    if (!input.trim()) {
      toast.info("Please describe your dispute or case in the input box first, then click Summarize!");
      return;
    }

    const caseText = input.trim();
    setInput("");

    setMessages(prev => [
      ...prev,
      { role: "user", content: `Analyze and summarize this case: "${caseText}"` }
    ]);
    setIsLoading(true);

    try {
      const analysis = await apiRequest("/ai/summarize-case", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ caseDescription: caseText })
      });

      const formattedResponse = `⚖️ **AI Case Summary & Legal Brief**
━━━━━━━━━━━━━━━━━━━━━
📌 **Executive Summary:**
${analysis.summary}

🏷️ **Recommended Category:** ${analysis.recommendedCategory}

📖 **Applicable Laws & Sections:**
${(analysis.applicableLaws || []).map(l => `• ${l}`).join('\n')}

🚀 **Recommended Action Steps:**
${(analysis.recommendedSteps || []).map(s => `1. ${s}`).join('\n')}

📄 **Required Documents Checklist:**
${(analysis.requiredDocuments || []).map(d => `✔ ${d}`).join('\n')}`;

      setMessages(prev => [...prev, { role: "assistant", content: formattedResponse }]);
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("Unable to generate case summary.");
      setMessages(prev => [...prev, { role: "assistant", content: "Failed to generate legal summary. Please check your network or try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl p-0 flex items-center justify-center z-[100] hover:scale-110 transition-transform bg-amber-500 hover:bg-amber-600"
      >
        <Bot className="h-7 w-7 text-white" />
      </Button>
    );
  }

  return (
    <div className={`fixed right-6 bottom-6 z-[100] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${isMinimized ? 'h-14 w-72' : isExpanded ? 'w-[90vw] h-[80vh] sm:w-[600px] sm:h-[70vh] max-h-[90vh]' : 'h-[520px] w-[360px] sm:w-[420px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <span className="font-bold text-base">LawConnect AI</span>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={handleNewChat} title="New Chat">
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={() => setShowHistory(!showHistory)} title="History">
                <History className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Shrink" : "Expand"}>
                {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={() => {
            setIsMinimized(!isMinimized);
            if (!isMinimized) setIsExpanded(false);
          }}>
            {isMinimized ? <Square className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
              <h3 className="font-semibold text-sm mb-4">Past Conversations</h3>
              {sessions.length === 0 && <p className="text-xs text-muted-foreground">No history found.</p>}
              {sessions.map(session => (
                <div key={session.id} className="bg-background border rounded p-3 flex justify-between items-start gap-2 hover:border-primary/50 transition-colors">
                  <div 
                    className="flex-1 cursor-pointer overflow-hidden" 
                    onClick={() => { setMessages(session.messages); setSessionId(session.id); setShowHistory(false); }}
                  >
                    <p className="text-xs font-medium truncate">{session.messages.find(m => m.role === 'user')?.content || "Empty chat"}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(session.date).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-100" onClick={(e) => {
                    e.stopPropagation();
                    const updated = sessions.filter(s => s.id !== session.id);
                    setSessions(updated);
                    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
                    if (session.id === sessionId) {
                      setMessages([{ role: "assistant", content: "Hi! I'm your LawConnect AI Assistant. How can I help you with your legal queries today?" }]);
                      setSessionId(Date.now());
                    }
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end group' : 'justify-start'}`}>
                    {msg.role === 'user' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mr-2 opacity-0 group-hover:opacity-100 transition-opacity self-center text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => {
                          setInput(msg.content);
                          setMessages(messages.slice(0, idx));
                        }}
                        title="Edit Prompt"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-muted border text-foreground rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted border rounded-2xl rounded-tl-none px-4 py-3 text-sm flex gap-1">
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick AI Action Buttons */}
              <div className="px-3 py-1.5 bg-muted/30 border-t flex items-center gap-1.5 overflow-x-auto text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1 shrink-0 rounded-full bg-background hover:bg-primary/10 border-primary/30"
                  onClick={handleCaseAnalysis}
                  disabled={isLoading}
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  AI Case Brief
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1 shrink-0 rounded-full bg-background hover:bg-primary/10"
                  onClick={() => setInput("What documents do I need to prepare before meeting a lawyer?")}
                  disabled={isLoading}
                >
                  <FileText className="h-3 w-3 text-blue-500" />
                  Docs Checklist
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1 shrink-0 rounded-full bg-background hover:bg-primary/10"
                  onClick={() => setInput("How does consultation booking work on LawConnect?")}
                  disabled={isLoading}
                >
                  <Scale className="h-3 w-3 text-emerald-500" />
                  How It Works
                </Button>
              </div>

              {/* Footer Form */}
              <div className="p-3 border-t bg-background">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask legal question or type case details..."
                    className="flex-1 text-xs sm:text-sm"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
