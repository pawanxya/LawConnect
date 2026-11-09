import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

import {
  addCaseTimelineEvent,
  updateCaseTimelineEvent,
  cancelBooking,
  fetchBookings,
  fetchCases,
  fetchMessages,
  uploadDocument,
  updateCaseStatus,
  submitReview,
} from "@/lib/dataService";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/paymentService";
import { LawyerSuggestions } from "@/components/LawyerSuggestions";
import { CaseUpdateDialog } from "@/components/CaseUpdateDialog";
import { TimelineEventEditDialog } from "@/components/TimelineEventEditDialog";
import { socket } from "@/lib/socketClient";
import {
  Briefcase,
  Calendar as CalendarIcon,
  Clock,
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
  Upload,
  X,
  CheckCircle,
  Star,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [cases, setCases] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingCaseId, setUploadingCaseId] = useState(null);
  const [reviewData, setReviewData] = useState({}); // { [caseId]: { rating, comment } }
  const [submittingReview, setSubmittingReview] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [casesData, bookingsData, messagesData] = await Promise.all([
          fetchCases(),
          fetchBookings().catch(() => []),
          fetchMessages().catch(() => []),
        ]);
        if (isMounted) {
          setCases(casesData);
          setBookings(bookingsData || []);
          setMessages(messagesData || []);
        }
      } catch (error) {
        toast.error(error.message || "Unable to load dashboard data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!currentUser?.id) return;

    socket.connect();
    socket.emit("join", currentUser.id);

    const handleCaseUpdate = (updatedCase) => {
      setCases((prev) => {
        const exists = prev.some((c) => c.id === updatedCase.id);
        if (exists) {
          return prev.map((c) => (c.id === updatedCase.id ? updatedCase : c));
        }
        return [updatedCase, ...prev];
      });
    };
    socket.on("case_update", handleCaseUpdate);
    socket.on("timeline_update", handleCaseUpdate);

    const handleBookingUpdate = (updatedBooking) => {
      setBookings((prev) => {
        const exists = prev.some((b) => b.id === updatedBooking.id);
        if (exists) {
          return prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b));
        }
        return [updatedBooking, ...prev];
      });
    };
    socket.on("booking_updated", handleBookingUpdate);

    const handleNewMessage = (newMsg) => {
      setMessages((prev) => {
        const msgId = newMsg._id || newMsg.id;
        if (prev.some((m) => (m._id || m.id) === msgId)) return prev;
        return [newMsg, ...prev];
      });
    };
    socket.on("receive_message", handleNewMessage);

    return () => {
      socket.off("case_update", handleCaseUpdate);
      socket.off("timeline_update", handleCaseUpdate);
      socket.off("booking_updated", handleBookingUpdate);
      socket.off("receive_message", handleNewMessage);
    };
  }, [currentUser?.id]);

  // ── Derived stats (all real) ──────────────────────────────────────────────
  const stats = useMemo(() => ({
    activeCases: cases.filter((c) => c.status === "active").length,
    documents: cases.reduce((n, c) => n + (c.documents?.length ?? 0), 0),
    hearings: cases.reduce((n, c) => {
      const upcoming = (c.hearingDates || []).filter(h => {
        if (h.status === "completed") return false;
        if (!h.date) return false;
        
        // Use local date comparison
        const now = new Date();
        now.setHours(0,0,0,0);
        const [y, m, d] = h.date.split("-");
        const dt = new Date(y, m - 1, d);
        return dt >= now;
      });
      return n + upcoming.length;
    }, 0),
    bookings: bookings.filter((b) => b.status !== "cancelled").length,
    unreadMessages: messages.filter(
      (m) => m.receiverId === currentUser?.id && !m.read
    ).length,
  }), [cases, bookings, messages, currentUser?.id]);

  // ── Real messages preview: group by partner, pick most recent per partner ─
  const messageConversations = useMemo(() => {
    if (!currentUser?.id) return [];
    const byPartner = new Map();

    messages.forEach((msg) => {
      const isMine = msg.senderId === currentUser.id;
      const partnerId = isMine ? msg.receiverId : msg.senderId;
      const partnerName = isMine ? (msg.receiverName || "Lawyer") : (msg.senderName || "Lawyer");
      const ts = new Date(msg.timestamp).getTime();

      if (!byPartner.has(partnerId) || byPartner.get(partnerId).ts < ts) {
        byPartner.set(partnerId, {
          partnerId,
          partnerName,
          lastMessage: msg.content || (msg.attachment ? "📎 Attachment" : ""),
          ts,
          unread: !isMine && !msg.read,
        });
      }
    });

    return Array.from(byPartner.values()).sort((a, b) => b.ts - a.ts).slice(0, 5);
  }, [messages, currentUser?.id]);

  // ── All documents across cases ────────────────────────────────────────────
  const allDocuments = useMemo(() =>
    cases.flatMap((c) =>
      (c.documents || []).map((doc) => ({ ...doc, caseTitle: c.title, caseId: c.id }))
    ),
  [cases]);

  // ── Case update handler ───────────────────────────────────────────────────
  const handleCaseUpdate = async (caseId, update) => {
    try {
      const updated = await addCaseTimelineEvent(caseId, {
        title: "Client Update",
        description: update,
        type: "update",
      });
      if (updated) {
        setCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
      }
    } catch (error) {
      toast.error(error.message || "Failed to add update.");
    }
  };

  const handleTimelineUpdate = async (caseId, eventId, update) => {
    try {
      const updatedCase = await updateCaseTimelineEvent(caseId, eventId, update);
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? updatedCase : c))
      );
      toast.success("Timeline event updated successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to update timeline event.");
    }
  };

  // ── Document upload ───────────────────────────────────────────────────────
  const handleDocumentUpload = async (caseId, file) => {
    if (!file) return;
    try {
      setUploadingCaseId(caseId);
      await uploadDocument(file, caseId);
      toast.success(`"${file.name}" uploaded.`);
      // Refresh cases to get updated document list
      const updated = await fetchCases().catch(() => cases);
      setCases(updated);
    } catch (error) {
      toast.error(error.message || "Failed to upload document.");
    } finally {
      setUploadingCaseId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Download document ─────────────────────────────────────────────────────
  const handleDocumentDownload = (doc) => {
    if (!doc.url) {
      toast.error("Download URL not available for this document.");
      return;
    }
    const link = document.createElement("a");
    link.href = doc.url;
    link.setAttribute("download", doc.name || "document");
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Cancel booking ────────────────────────────────────────────────────────
  const handleCancelBooking = async (bookingId) => {
    try {
      await cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
      );
      toast.success("Booking cancelled.");
    } catch (error) {
      toast.error(error.message || "Failed to cancel booking.");
    }
  };

  // ── Pay Case Fee (Razorpay) ────────────────────────────────────────────────
  const handlePayCaseFee = async (caseItem) => {
    try {
      const res = await (async () => {
        const scriptLoaded = await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

        if (!scriptLoaded) {
          toast.error("Razorpay SDK failed to load. Check your internet connection.");
          return;
        }

        const orderData = await createRazorpayOrder({
          amount: caseItem.finalFee,
          caseId: caseItem.id
        });

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "LawConnect",
          description: `Case Final Fee - ${caseItem.title}`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              const result = await verifyRazorpayPayment({
                ...response,
                caseId: caseItem.id
              });
              setCases((prev) => prev.map((c) => (c.id === caseItem.id ? result.caseItem : c)));
              toast.success("Payment successful! Case fee settled.");
            } catch (err) {
              toast.error(err.message || "Payment verification failed.");
            }
          },
          prefill: {
            name: currentUser.name,
            email: currentUser.email,
            contact: currentUser.phone || "",
          },
          theme: {
            color: "#0f172a",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      })();
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error(error.message || "Payment initialization failed.");
    }
  };

  const handleCompleteCase = async (caseId) => {
    if (!confirm("Are you sure you want to mark this case as completed? This will finalize the status and initiate the final fee payment.")) {
      return;
    }
    try {
      const updatedCase = await updateCaseStatus(caseId, "closed");
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
      toast.success("Case marked as completed!");
    } catch (error) {
      toast.error(error.message || "Failed to complete case.");
    }
  };

  const handleReviewSubmit = async (caseItem) => {
    const data = reviewData[caseItem.id] || { rating: 5, comment: "" };
    if (!data.comment.trim()) {
      toast.error("Please enter a comment.");
      return;
    }
    try {
      setSubmittingReview(true);
      await submitReview({
        lawyerId: caseItem.lawyerId,
        rating: data.rating,
        comment: data.comment,
        caseId: caseItem.id
      });
      toast.success("Review submitted successfully!");
      // Clear only this case's review data
      setReviewData(prev => ({ ...prev, [caseItem.id]: undefined }));
    } catch (error) {
      toast.error(error.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const updateReviewState = (caseId, field, value) => {
    setReviewData(prev => ({
      ...prev,
      [caseId]: {
        ...(prev[caseId] || { rating: 5, comment: "" }),
        [field]: value
      }
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Hidden file input for document upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingCaseId) handleDocumentUpload(uploadingCaseId, file);
        }}
      />
      <div className="flex-1">
        <div className="gradient-primary py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Welcome back, {currentUser?.name || "Client"}!
                </h1>
                <p className="text-white/80 mt-2">
                  Manage your cases, documents, hearings, and conversations in one place.
                </p>
              </div>
              {currentUser?.membershipTier && currentUser.membershipTier !== "" && (
                <Badge className={
                  currentUser.membershipTier === "plus"
                    ? "bg-yellow-500 text-slate-900 hover:bg-yellow-500 font-extrabold text-lg px-5 py-2.5 rounded-full border-none shadow-lg shadow-yellow-500/20"
                    : "bg-slate-700 text-slate-200 hover:bg-slate-700 font-semibold text-lg px-5 py-2.5 rounded-full border-none shadow-md"
                }>
                  {currentUser.membershipTier === "plus" ? "Client Plus" : "Free Membership"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Row */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Cases</p>
                    <p className="text-2xl font-bold">{stats.activeCases}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/bookings")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <CalendarIcon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bookings</p>
                    <p className="text-2xl font-bold">{stats.bookings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/messages")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unread Messages</p>
                    <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <FileText className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-2xl font-bold">{stats.documents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <CalendarIcon className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Upcoming Hearings</p>
                    <p className="text-2xl font-bold">{stats.hearings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="cases" className="w-full">
            <TabsList>
              <TabsTrigger value="cases">My Cases</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="calendar">Hearing History</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            {/* ── Cases Tab ─────────────────────────────────────────────── */}
            <TabsContent value="cases" className="mt-6 space-y-4">
              {isLoading ? (
                <Card><CardContent className="p-6 text-muted-foreground">Loading cases...</CardContent></Card>
              ) : cases.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-muted-foreground">
                    No active cases yet. Once you start a consultation, your case timeline will show up here.
                  </CardContent>
                </Card>
              ) : (
                cases.map((caseItem) => (
                  <Card key={caseItem.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>{caseItem.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">Case ID: {caseItem.id}</p>
                        </div>
                        <Badge variant={caseItem.status === "active" ? "default" : "secondary"}>
                          {caseItem.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="text-muted-foreground mb-4">{caseItem.description}</p>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm font-medium">{fmtDate(caseItem.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Documents</p>
                            <p className="text-sm font-medium">{caseItem.documents?.length ?? 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Last Updated</p>
                            <p className="text-sm font-medium">{fmtDate(caseItem.updatedAt)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Case Documents List */}
                      {caseItem.documents && caseItem.documents.length > 0 && (
                        <div className="mb-6 space-y-2 pt-4 border-t">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Case Documents</h4>
                          {caseItem.documents.map((doc) => (
                            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold truncate">{doc.name}</p>
                                  <p className="text-[10px] text-muted-foreground italic">Uploaded on {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDocumentDownload(doc)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Next Hearing Section - Concise Bar */}
                      {(() => {
                        const hearings = (caseItem.hearingDates || []).filter(h => h.date);
                        if (hearings.length === 0) return null;

                        const now = new Date();
                        now.setHours(0,0,0,0);

                        const parseFlexDate = (str) => {
                          if (!str) return null;
                          // Try YYYY-MM-DD
                          if (str.includes("-")) {
                            const [y, m, d] = str.split("-");
                            if (y.length === 4) return new Date(y, m - 1, d);
                            if (d?.length === 4) return new Date(d, m - 1, y); // DD-MM-YYYY
                          }
                          const d = new Date(str);
                          return isNaN(d.getTime()) ? null : d;
                        };

                        const nextHearing = (caseItem.hearingDates || [])
                          .map(h => ({ ...h, dt: parseFlexDate(h.date) }))
                          .filter(h => h.dt)
                          .filter(h => {
                            const hd = new Date(h.dt);
                            hd.setHours(0,0,0,0);
                            return hd >= now && h.status !== "completed";
                          })
                          .sort((a,b) => a.dt - b.dt)[0];
                        
                        if (!nextHearing) return null;

                        const daysLeft = Math.ceil((new Date(nextHearing.dt).setHours(0,0,0,0) - now.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <div className="mb-6 p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-primary rounded-md">
                                <CalendarDays className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex items-center flex-wrap gap-x-2">
                                <span className="text-sm font-bold text-primary uppercase">Next Hearing:</span>
                                <span className="text-sm font-semibold">
                                  {nextHearing.dt.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="text-muted-foreground">|</span>
                                <span className="text-sm font-medium text-muted-foreground">{nextHearing.title} @ {nextHearing.location}</span>
                              </div>
                            </div>
                            <Badge className={`border-none text-[10px] py-0 h-5 ${daysLeft === 0 ? 'bg-orange-500 text-white' : 'bg-primary/20 text-primary'}`}>
                              {daysLeft === 0 ? "TODAY" : `In ${daysLeft} Days`}
                            </Badge>
                          </div>
                        );
                      })()}

                      {/* Case Timeline */}
                      {caseItem.timeline?.length > 0 && (
                        <div className="border-t pt-4 mb-4">
                          <h4 className="font-semibold mb-3">Case Timeline</h4>
                          <div className="space-y-3">
                            {caseItem.timeline.map((event) => {
                                // Default texts for Client
                                let displayTitle = event.title;
                                let displayDesc = event.description;
                                
                                // Specific tweaks for Client view
                                if (event.title === "Consultation Request Sent") {
                                  displayTitle = "Case Request Sent Successfully";
                                  displayDesc = "Your case request has been sent to the lawyer. Waiting for their confirmation.";
                                }

                                return (
                                  <div key={event.id} className="flex gap-3 group">
                                    <div className="flex flex-col items-center">
                                      <div className="w-2 h-2 rounded-full bg-primary" />
                                      <div className="w-px h-full bg-border" />
                                    </div>
                                    <div className="flex-1 pb-3">
                                      <div className="flex items-start justify-between">
                                        <p className="text-lg font-bold">{displayTitle}</p>
                                        {event.addedByRole === "client" && (
                                          <TimelineEventEditDialog
                                            event={event}
                                            onUpdate={(eventId, update) => handleTimelineUpdate(caseItem.id, eventId, update)}
                                          />
                                        )}
                                      </div>
                                      <p className="text-base text-muted-foreground mt-1 leading-relaxed">{displayDesc}</p>
                                      <p className="text-sm text-muted-foreground/60 mt-1">{event.date}</p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate("/messages", { state: { partnerId: caseItem.lawyerId } })}
                          disabled={caseItem.status === "pending"}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message Lawyer
                        </Button>
                        <CaseUpdateDialog
                          caseId={caseItem.id}
                          caseTitle={caseItem.title}
                          disabled={caseItem.status !== "active"}
                          onUpdate={handleCaseUpdate}
                        />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingCaseId === caseItem.id || caseItem.status !== "active"}
                            onClick={() => {
                              setUploadingCaseId(caseItem.id);
                              fileInputRef.current?.click();
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingCaseId === caseItem.id ? "Uploading…" : "Upload Doc"}
                          </Button>
                          {caseItem.status === "active" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleCompleteCase(caseItem.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Close Case
                            </Button>
                          )}
                        </div>
                        {caseItem.status === "closed" && caseItem.paymentStatus === "unpaid" && (
                          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between">
                            <div>
                              <p className="font-semibold">Case Completed</p>
                              <p className="text-sm text-muted-foreground">Final Fee: INR {caseItem.finalFee}</p>
                            </div>
                            <Button onClick={() => handlePayCaseFee(caseItem)}>
                              Pay Final Fee
                            </Button>
                          </div>
                        )}
                        {caseItem.status === "closed" && caseItem.paymentStatus === "paid" && (
                          <div className="mt-4 p-4 bg-green-500/5 rounded-lg border border-green-500/20 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-green-600">Case Completed & Paid</p>
                              <p className="text-sm text-muted-foreground">The final fee has been settled.</p>
                            </div>
                            <Badge className="bg-green-600">Paid</Badge>
                          </div>
                        )}
                        {caseItem.status === "closed" && caseItem.paymentStatus === "paid" && (
                          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed">
                            <h4 className="text-sm font-semibold mb-3">Rate your experience with the lawyer</h4>
                            <div className="flex gap-2 mb-3">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => updateReviewState(caseItem.id, "rating", star)}
                                  className="focus:outline-none"
                                >
                                  <Star
                                    className={`h-6 w-6 ${
                                      star <= (reviewData[caseItem.id]?.rating || 5)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <textarea
                              className="w-full p-3 text-sm border rounded-md bg-background focus:ring-1 focus:ring-primary outline-none"
                              placeholder="Write your review here..."
                              rows={3}
                              value={reviewData[caseItem.id]?.comment || ""}
                              onChange={(e) => updateReviewState(caseItem.id, "comment", e.target.value)}
                            />
                            <Button
                              className="mt-3 w-full"
                              size="sm"
                              disabled={submittingReview}
                              onClick={() => handleReviewSubmit(caseItem)}
                            >
                              {submittingReview ? "Submitting..." : "Submit Review"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                ))
              )}
            </TabsContent>

            {/* ── Documents Tab ─────────────────────────────────────────── */}
            <TabsContent value="documents" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Case Documents</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cases.length === 0}
                    onClick={() => {
                      if (cases[0]) {
                        setUploadingCaseId(cases[0].id);
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </CardHeader>
                <CardContent>
                  {allDocuments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No documents uploaded yet. Use the button above or "Upload Doc" on a case.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB · ` : ""}
                                {fmtDate(doc.uploadedAt)} · Case: {doc.caseTitle}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-3">
                            {doc.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Open in new tab"
                                onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Download"
                              onClick={() => handleDocumentDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Messages Tab — real previews ──────────────────────────── */}
            <TabsContent value="messages" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Messages</CardTitle>
                  <Button size="sm" onClick={() => navigate("/messages")}>
                    Open Chat
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading messages…</p>
                  ) : messageConversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No messages yet. Book a consultation to start messaging your lawyer.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {messageConversations.map((conv) => (
                        <div
                          key={conv.partnerId}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate("/messages")}
                        >
                          <div className="flex items-start justify-between mb-1 gap-4">
                            <p className="font-semibold">{conv.partnerName}</p>
                            {conv.unread && <Badge>New</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(conv.ts).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Hearing History Tab ──────────────────────────────────────────── */}
            <TabsContent value="calendar" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hearing History</CardTitle>
                </CardHeader>
                <CardContent>
                  {cases.flatMap((c) => c.hearingDates || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hearings in history.</p>
                  ) : (
                    <div className="space-y-4">
                      {cases.flatMap((caseItem) =>
                        (caseItem.hearingDates || []).map((hearing, idx) => (
                          <div
                            key={hearing.id || `${caseItem.id}-${idx}`}
                            className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <CalendarIcon className="h-5 w-5 text-primary mt-1" />
                              <div className="flex-1">
                                <h4 className="font-semibold">{caseItem.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {hearing.date} | {hearing.title}
                                </p>
                                <p className="text-sm text-muted-foreground">{hearing.location}</p>
                              </div>
                            </div>
                            <Badge className={
                              hearing.status === "completed"
                                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 shrink-0"
                                : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 shrink-0"
                            } variant="outline">
                              {hearing.status === "completed" ? "Completed" : "Scheduled"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Bookings Tab — real data ───────────────────────────────── */}
            <TabsContent value="bookings" className="space-y-4 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Consultation Bookings</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate("/bookings")}>
                    Full View
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading bookings…</p>
                  ) : bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No bookings yet.{" "}
                      <span
                        className="text-primary underline cursor-pointer"
                        onClick={() => navigate("/lawyers")}
                      >
                        Find a lawyer
                      </span>{" "}
                      to book a consultation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="font-semibold">{booking.lawyerName || "Lawyer"}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.date} | {booking.timeSlot}
                              </p>
                            </div>
                            <Badge
                              variant={
                                booking.status === "approved"
                                  ? "default"
                                  : booking.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          {booking.notes && (
                            <p className="text-sm text-muted-foreground mb-2">{booking.notes}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Payment:{" "}
                              <span className="font-medium capitalize text-foreground">
                                {booking.paymentStatus || "unpaid"}
                              </span>
                            </p>
                            {booking.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <LawyerSuggestions />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
