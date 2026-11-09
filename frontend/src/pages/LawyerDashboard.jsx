import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { CaseUpdateDialog } from "@/components/CaseUpdateDialog";
import { CaseHearingDialog } from "@/components/CaseHearingDialog";
import { TimelineEventEditDialog } from "@/components/TimelineEventEditDialog";
import {
  addCaseHearing,
  updateHearingStatus,
  addCaseTimelineEvent,
  updateCaseTimelineEvent,
  createLawyerSlot,
  deleteLawyerSlot,
  fetchBookings,
  fetchCases,
  fetchLawyerEarnings,
  fetchLawyerSlots,
  updateBookingStatus,
  updateCaseStatus,
  updateLawyerSlot,
  uploadDocument,
  updateLawyerProfile,
  updateCaseFee,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  updateMembershipTier,
} from "@/lib/dataService";
import { socket } from "@/lib/socketClient";
import {
  addMinutesToTime,
  generateDefaultSlots,
  formatSlot,
  formatDate,
  getWeekdayDatesFrom,
} from "@/lib/slotUtils";
import {
  Briefcase,
  CheckCircle,
  IndianRupee,
  MessageSquare,
  Paperclip,
  Plus,
  Star,
  TrendingUp,
  Users,
  XCircle,
  Zap,
  Download,
  FileText,
  Calendar as CalendarIcon,
  ArrowRight,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const LawyerDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const handleUpdateRate = async (newRate) => {
    try {
      await updateLawyerProfile({ hourlyRate: newRate });
      toast.success(`Consultation rate updated to INR ${newRate}`);
      setTimeout(() => window.location.reload(), 1000); 
    } catch (error) {
      toast.error(error.message || "Failed to update rate.");
    }
  };

  const handleUpdateFee = async (caseId, newFee) => {
    try {
      await updateCaseFee(caseId, newFee);
      toast.success(`Case fee updated to INR ${newFee}`);
      const updated = await fetchCases().catch(() => null);
      if (updated) setLawyerCases(updated);
    } catch (error) {
      toast.error(error.message || "Failed to update case fee.");
    }
  };

  const handleUpgradeToPremium = async () => {
    try {
      const order = await createSubscriptionOrder("premium");
      
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "LawConnect Premium",
        description: "1 Month Premium Membership Subscription",
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };
            await verifySubscriptionPayment(verificationPayload);
            toast.success("Successfully upgraded to Premium!");
            setTimeout(() => window.location.reload(), 1000);
          } catch (err) {
            toast.error(err.message || "Verification failed. Please contact support.");
          }
        },
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
        },
        theme: {
          color: "#0f172a",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.message || "Failed to initiate premium upgrade.");
    }
  };

  const handleDowngradeToBasic = async () => {
    try {
      await updateMembershipTier("basic");
      toast.success("Subscription downgraded to Basic successfully.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Failed to downgrade subscription.");
    }
  };

  const [lawyerCases, setLawyerCases] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [earningsData, setEarningsData] = useState({ 
    totalEarnings: 0, 
    consultationEarnings: 0,
    caseEarnings: 0,
    thisMonthEarnings: 0, 
    transactionsCount: 0,
    consultationsCount: 0,
    casesCount: 0,
    reputationScore: 0,
    rating: 0,
    totalReviews: 0
  });
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [slotForm, setSlotForm] = useState({ date: "", startTime: "10:00", endTime: "11:00" });
  const [editingSlotId, setEditingSlotId] = useState("");
  const [uploadingCaseId, setUploadingCaseId] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [newService, setNewService] = useState({ name: "", fee: "" });
  const fileInputRef = useRef(null);

  const handleAddService = async () => {
    if (!newService.name || !newService.fee) return toast.error("Please fill all fields");
    const updatedServices = [...(currentUser?.services || []), { ...newService, fee: Number(newService.fee) }];
    try {
      await updateLawyerProfile({ services: updatedServices });
      toast.success("Service added successfully");
      setNewService({ name: "", fee: "" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Failed to add service");
    }
  };

  const handleRemoveService = async (serviceId) => {
    const updatedServices = currentUser.services.filter(s => s.id !== serviceId);
    try {
      await updateLawyerProfile({ services: updatedServices });
      toast.success("Service removed");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Failed to remove service");
    }
  };

  // verified comes from the lawyer profile via hydrateUser in authController
  const isVerifiedLawyer = currentUser?.verified === true;

  useEffect(() => {
    if (!isVerifiedLawyer) {
      setIsLoadingCases(false);
      return undefined;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const [casesData, earnings, bookingsData, slotsData] = await Promise.all([
          fetchCases(),
          fetchLawyerEarnings().catch(() => ({ totalEarnings: 0, thisMonthEarnings: 0, transactionsCount: 0 })),
          fetchBookings().catch(() => []),
          fetchLawyerSlots().catch(() => []),
        ]);
        if (isMounted) {
          setLawyerCases(casesData);
          setEarningsData(earnings);
          setBookings(bookingsData);
          setSlots(slotsData);
        }
      } catch (error) {
        toast.error(error.message || "Unable to load data.");
      } finally {
        if (isMounted) setIsLoadingCases(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [isVerifiedLawyer]);

  useEffect(() => {
    if (!currentUser?.id || !isVerifiedLawyer) return;

    socket.connect();
    socket.emit("join", currentUser.id);

    const handleSocketUpdate = (updatedCase) => {
      setLawyerCases((prev) => {
        const exists = prev.some((c) => c.id === updatedCase.id);
        if (exists) {
          return prev.map((c) => (c.id === updatedCase.id ? updatedCase : c));
        }
        return [updatedCase, ...prev];
      });
    };

    socket.on("case_update", handleSocketUpdate);
    socket.on("timeline_update", handleSocketUpdate);

    const handleBookingUpdate = (updatedBooking) => {
      setBookings((prev) => {
        const exists = prev.find((b) => b.id === updatedBooking.id);
        if (exists) {
          return prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b));
        }
        return [updatedBooking, ...prev];
      });
    };
    socket.on("booking_updated", handleBookingUpdate);

    return () => {
      socket.off("case_update", handleSocketUpdate);
      socket.off("timeline_update", handleSocketUpdate);
      socket.off("booking_updated", handleBookingUpdate);
    };
  }, [currentUser?.id, isVerifiedLawyer]);

  const handleAddHearing = async (caseId, hearingData) => {
    try {
      const updated = await addCaseHearing(caseId, hearingData);
      setLawyerCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
      toast.success("Hearing scheduled successfully!");
    } catch (e) {
      toast.error(e.message || "Failed to schedule hearing.");
      throw e;
    }
  };

  const handleUpdateHearingStatus = async (caseId, hearingId, status) => {
    try {
      const updated = await updateHearingStatus(caseId, hearingId, status);
      setLawyerCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
      toast.success(`Hearing marked as ${status}.`);
    } catch (e) {
      toast.error(e.message || "Failed to update hearing status.");
    }
  };

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

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings],
  );

  const stats = {
    totalEarnings: earningsData.totalEarnings || 0,
    consultationEarnings: earningsData.consultationEarnings || 0,
    caseEarnings: earningsData.caseEarnings || 0,
    thisMonthEarnings: earningsData.thisMonthEarnings || 0,
    activeCases: lawyerCases.filter((c) => c.status === "active").length,
    rating: earningsData.rating || currentUser?.rating || 0,
    totalReviews: earningsData.totalReviews || currentUser?.totalReviews || 0,
    reputationScore: earningsData.reputationScore || 0,
  };

  const resetSlotForm = () => {
    setSlotForm({ date: "", startTime: "10:00", endTime: "11:00" });
    setEditingSlotId("");
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = String(hour).padStart(2, "0");
        const m = String(minute).padStart(2, "0");
        const time24 = `${h}:${m}`;
        
        // Convert to AM/PM for label
        const displayHour = hour % 12 || 12;
        const ampm = hour >= 12 ? "PM" : "AM";
        const label = `${displayHour}:${m} ${ampm}`;
        
        options.push({ value: time24, label });
      }
    }
    return options;
  };
  
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // Upload document for a specific case
  const handleDocumentUpload = async (caseId, file) => {
    if (!file) return;
    try {
      setUploadingCaseId(caseId);
      await uploadDocument(file, caseId);
      toast.success(`Document "${file.name}" uploaded to case.`);
      // Refresh case data
      const response = await fetchCases().catch(() => null);
      if (response) setLawyerCases(response);
    } catch (error) {
      toast.error(error.message || "Failed to upload document.");
    } finally {
      setUploadingCaseId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isVerifiedLawyer) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <div className="flex-1">
          <div className="gradient-primary py-8">
            <div className="container mx-auto px-4">
              <h1 className="text-3xl font-bold text-white">
                Welcome, {currentUser?.name || "Lawyer"}
              </h1>
              <p className="text-white/80">
                Your LawConnect lawyer account is pending admin verification.
              </p>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Verification In Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You can login and manage basic account details, but consultations, slots,
                  earnings, and client workflows will unlock only after admin approval.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={() => navigate("/profile")}>Open Profile</Button>
                  <Button variant="outline" onClick={() => navigate("/settings")}>
                    Open Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSlotSubmit = async () => {
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) {
      toast.error("Please fill date, start time, and end time.");
      return;
    }

    try {
      // Convert time to 24h format for backend if needed, but our slot system already handles HH:mm
      // Let's just ensure it's valid
      const date = slotForm.date;
      let createdCount = 0;
      
      try {
        await createLawyerSlot({ date, startTime: slotForm.startTime, endTime: slotForm.endTime });
        createdCount = 1;
      } catch (error) {
        if (!String(error?.message || "").toLowerCase().includes("already exists")) {
          throw error;
        }
      }

      const updatedSlots = await fetchLawyerSlots();
      setSlots(updatedSlots || []);
      resetSlotForm();
      toast.success(
        createdCount > 0
          ? `Created slot for ${formatDate(date)} at ${slotForm.startTime}.`
          : "This slot already exists for the selected date."
      );
    } catch (error) {
      toast.error(error.message || "Unable to save slot.");
    }
  };

  const convertTo24h = (time12, period) => {
    let [hours, minutes] = time12.split(":").map(Number);
    if (!hours && hours !== 0) hours = 10;
    if (!minutes && minutes !== 0) minutes = 0;
    
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const handleTimeChange = (type, value, part) => {
    setSlotForm(prev => {
      const currentFullTime = (type === "start" ? prev.startTime : prev.endTime) || "10:00";
      const parts = currentFullTime.split(":");
      let h = parts[0] || "10";
      let m = parts[1] || "00";
      
      let period = parseInt(h) >= 12 ? "PM" : "AM";
      let displayH = parseInt(h) % 12 || 12;
      
      let newH = displayH;
      let newM = m;
      let newPeriod = period;

      if (part === "time") {
        if (!value.includes(":")) {
          newH = parseInt(value) || 12;
          newM = "00";
        } else {
          const [typedH, typedM] = value.split(":").map(v => v || "00");
          newH = parseInt(typedH) || 12;
          newM = typedM;
        }
      } else if (part === "period") {
        newPeriod = value;
      }

      const new24h = convertTo24h(`${newH}:${newM}`, newPeriod);
      const next = { ...prev };
      if (type === "start") {
        next.startTime = new24h;
        if (!editingSlotId) next.endTime = addMinutesToTime(new24h, 60);
      } else {
        next.endTime = new24h;
      }
      return next;
    });
  };

  const getDisplayTime = (time24) => {
    if (!time24 || typeof time24 !== "string" || !time24.includes(":")) {
      return { time: "10:00", period: "AM" };
    }
    const [h, m] = time24.split(":");
    const hour = parseInt(h) || 0;
    const displayH = hour % 12 || 12;
    const period = hour >= 12 ? "PM" : "AM";
    return { time: `${String(displayH).padStart(2, "0")}:${m || "00"}`, period };
  };

  const handleEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setSlotForm({ date: slot.date || "", startTime: slot.startTime, endTime: slot.endTime });
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      const response = await deleteLawyerSlot(slotId);
      setSlots(response.slots || []);
      if (editingSlotId === slotId) resetSlotForm();
      toast.success("Slot deleted.");
    } catch (error) {
      toast.error(error.message || "Unable to delete slot.");
    }
  };

  const handleGenerateDefaultSlots = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const defaultSlots = generateDefaultSlots(dateStr);
      let createdCount = 0;

      for (const slot of defaultSlots) {
        try {
          await createLawyerSlot({ date: dateStr, startTime: slot.startTime, endTime: slot.endTime });
          createdCount++;
        } catch (e) {
          // skip existing
        }
      }

      if (createdCount > 0) {
        const updated = await fetchLawyerSlots();
        setSlots(updated || []);
        toast.success(`Generated ${createdCount} standard slots for tomorrow (10 AM - 4 PM).`);
      } else {
        toast.info("No new slots were generated. Slots may already exist for that day.");
      }
    } catch (error) {
      toast.error(error.message || "Unable to generate default slots.");
    }
  };

  const handleBookingStatusChange = async (bookingId, status) => {
    if (status === "approved" && (currentUser?.membershipTier === "basic" || !currentUser?.membershipTier)) {
      const activeOrApprovedCount = bookings.filter(
        (b) => b.status === "approved" || b.status === "completed" || b.status === "paid"
      ).length;
      if (activeOrApprovedCount >= 1) {
        toast.error("Under the free Basic Plan, you can only approve exactly 1 consultation. Please upgrade to Premium.");
        setTimeout(() => {
          window.location.href = "/pricing";
        }, 1500);
        return;
      }
    }

    try {
      const updatedBooking = await updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updatedBooking : b)),
      );
      setSlots(await fetchLawyerSlots().catch(() => slots));
      toast.success(`Booking ${status}.`);
    } catch (error) {
      toast.error(error.message || "Unable to update booking.");
    }
  };

  const handleCaseStatusUpdate = async (caseId, status) => {
    if (status === "active" && (!currentUser?.membershipTier || currentUser.membershipTier !== "premium")) {
      toast.error("You must upgrade to the Premium Plan to accept and manage cases. The free Basic Plan only supports exactly 1 consultation.");
      return;
    }

    try {
      const updatedCase = await updateCaseStatus(caseId, status);
      setLawyerCases((prev) =>
        prev.map((c) => (c.id === caseId ? updatedCase : c))
      );
      toast.success(`Case ${status === "active" ? "accepted" : status}.`);
    } catch (error) {
      toast.error(error.message || "Unable to update case status.");
    }
  };

  const handleTimelineUpdate = async (caseId, eventId, update) => {
    try {
      const updatedCase = await updateCaseTimelineEvent(caseId, eventId, update);
      setLawyerCases((prev) =>
        prev.map((c) => (c.id === caseId ? updatedCase : c))
      );
      toast.success("Timeline event updated successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to update timeline event.");
    }
  };

  const membershipLabel = currentUser?.membershipTier
    ? currentUser.membershipTier.charAt(0).toUpperCase() + currentUser.membershipTier.slice(1)
    : "Free";

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      {/* Hidden file input for document upload per case */}
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
                  Welcome back, {currentUser?.name || "Lawyer"}!
                </h1>
                <p className="text-white/80">Manage your practice, clients, and case activity.</p>
              </div>
              {currentUser?.membershipTier && currentUser.membershipTier !== "" && (
                <Badge className={
                  currentUser.membershipTier === "premium"
                    ? "gradient-premium text-lg px-4 py-2"
                    : "bg-slate-700 text-slate-200 hover:bg-slate-700 font-semibold text-lg px-4 py-2 rounded-full border-none shadow-md"
                }>
                  {currentUser.membershipTier === "premium" ? "Premium Member" : "Basic Member"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Grid */}
          <div className="grid md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
                  </div>
                  <IndianRupee className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Cases</p>
                    <p className="text-2xl font-bold">{stats.activeCases}</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="text-2xl font-bold">{stats.rating || "—"}</p>
                  </div>
                  <Star className="h-8 w-8 text-accent fill-accent" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="text-2xl font-bold">{stats.totalReviews}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reputation</p>
                    <p className="text-2xl font-bold">{stats.reputationScore}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Reputation Progress Bar */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Reputation Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Score</span>
                  <span className="font-semibold">{stats.reputationScore}/100</span>
                </div>
                <Progress value={stats.reputationScore} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  Based on client reviews, response time, and case success rate.
                </p>
              </div>
            </CardContent>
          </Card>





          <Tabs defaultValue="cases" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="cases">My Cases</TabsTrigger>
              <TabsTrigger value="slots">Manage Slots</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="requests" className="relative">
                Consultation Requests
                {pendingBookings.length > 0 && (
                  <span className="ml-2 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {pendingBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="fees" className="bg-primary/5 text-primary data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                Fees & Pricing
              </TabsTrigger>
              <TabsTrigger value="hearings">Hearing History</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            {/* Cases Tab */}
            <TabsContent value="cases" className="mt-6">
              <div className="grid gap-6">
                {isLoadingCases ? (
                  <Card><CardContent className="p-6 text-muted-foreground">Loading cases...</CardContent></Card>
                ) : lawyerCases.length === 0 ? (
                  <Card><CardContent className="p-6 text-muted-foreground">No cases yet. Once a client sends a consultation request, it will appear here.</CardContent></Card>
                ) : (
                  lawyerCases.map((caseItem) => (
                    <Card key={caseItem.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-xl">{caseItem.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Case ID: {caseItem.id}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={caseItem.status === "active" ? "default" : "secondary"}>
                              {caseItem.status}
                            </Badge>
                            {caseItem.paymentStatus === "paid" && (
                              <Badge className="bg-green-600 hover:bg-green-700 text-white border-none text-[10px] h-5">
                                Fee Paid
                              </Badge>
                            )}
                            {caseItem.status === "closed" && caseItem.paymentStatus === "unpaid" && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600 text-[10px] h-5">
                                Fee Pending
                              </Badge>
                            )}
                            {caseItem.status === "pending" && (
                              <div className="flex gap-1">
                                <Button
                                  className="h-8 px-2 bg-blue-600 hover:bg-blue-700 text-xs"
                                  onClick={() => handleCaseStatusUpdate(caseItem.id, "active")}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handleCaseStatusUpdate(caseItem.id, "rejected")}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{caseItem.description}</p>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm font-medium">
                              {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Documents</p>
                            <p className="text-sm font-medium">{caseItem.documents?.length ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Last Updated</p>
                            <p className="text-sm font-medium">
                              {caseItem.updatedAt ? new Date(caseItem.updatedAt).toLocaleDateString() : "—"}
                            </p>
                          </div>
                        </div>

                        {/* Responsive Document List */}
                        {caseItem.documents && caseItem.documents.length > 0 && (
                          <div className="mb-6 space-y-2">
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
                                    onClick={() => handleDownload(doc.url, doc.name)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Case Hearings */}
                        {caseItem.hearingDates && caseItem.hearingDates.length > 0 && (
                          <div className="mb-6 pt-4 border-t">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Scheduled Hearings</h4>
                            <div className="space-y-2">
                              {caseItem.hearingDates.sort((a,b) => new Date(a.date) - new Date(b.date)).map((h, idx) => (
                                <div key={h.id || `hearing-${idx}`} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                  <div>
                                    <p className="font-bold">{h.title}</p>
                                    <p className="text-sm text-muted-foreground">{h.date} @ {h.location}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {h.status === "completed" ? (
                                      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Completed
                                      </Badge>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-8 px-3 border-primary text-primary hover:bg-primary hover:text-white transition-all font-medium"
                                        onClick={() => handleUpdateHearingStatus(caseItem.id, h.id, "completed")}
                                      >
                                        Mark Done
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Case Timeline */}
                        {caseItem.timeline && caseItem.timeline.length > 0 && (
                          <div className="mb-6 pt-4 border-t">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Case Timeline</h4>
                            <div className="space-y-4">
                              {caseItem.timeline.map((event) => {
                                // Translate event text for Lawyer
                                let displayTitle = event.title;
                                let displayDesc = event.description;
                                
                                if (event.title === "Consultation Request Sent") {
                                  displayTitle = "New Case Request Received";
                                  displayDesc = "A client has sent you a new case request. Please review and accept to start.";
                                } else if (event.title === "Payment Verified") {
                                  displayTitle = "Payment Received";
                                  displayDesc = "Payment for this case has been successfully received in your account.";
                                }

                                return (
                                  <div key={event.id} className="flex gap-4 group">
                                  <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                                    <div className="w-px h-full bg-border mt-2" />
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between">
                                      <p className="text-lg font-bold">{displayTitle}</p>
                                      {event.addedByRole === "lawyer" && (
                                        <TimelineEventEditDialog
                                          event={event}
                                          onUpdate={(eventId, update) => handleTimelineUpdate(caseItem.id, eventId, update)}
                                        />
                                      )}
                                    </div>
                                    <p className="text-base text-muted-foreground mt-1 leading-relaxed">{displayDesc}</p>
                                    <p className="text-sm text-muted-foreground/60 mt-2">{event.date}</p>
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
                            onClick={() => navigate("/messages", { state: { partnerId: caseItem.clientId } })}
                            disabled={caseItem.status === "pending"}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Client
                          </Button>

                          <CaseUpdateDialog
                            caseId={caseItem.id}
                            caseTitle={caseItem.title}
                            disabled={caseItem.status !== "active"}
                            onUpdate={async (caseId, update) => {
                              try {
                                const updated = await addCaseTimelineEvent(caseId, {
                                  title: "Lawyer Update",
                                  description: update,
                                  type: "update",
                                  addedByRole: "lawyer",
                                });
                                setLawyerCases((prev) =>
                                  prev.map((c) => (c.id === caseId ? updated : c))
                                );
                              } catch (e) {
                                toast.error(e.message || "Failed to add update.");
                                throw e;
                              }
                            }}
                          />
                          <CaseHearingDialog 
                            caseId={caseItem.id}
                            disabled={caseItem.status !== "active"}
                            onAddHearing={handleAddHearing}
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
                            <Paperclip className="h-4 w-4 mr-2" />
                            {uploadingCaseId === caseItem.id ? "Uploading…" : "Upload Document"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Slots Tab */}
            <TabsContent value="slots" className="mt-6">
              <div className="grid lg:grid-cols-[360px,1fr] gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{editingSlotId ? "Update Slot" : "Create Slot"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/60">Select Date</Label>
                      <div className="border border-white/10 rounded-xl bg-white/5 p-2 shadow-inner">
                        <CalendarUI
                          mode="single"
                          selected={slotForm.date ? new Date(slotForm.date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setSlotForm(prev => ({ ...prev, date: format(date, "yyyy-MM-dd") }));
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="w-full"
                        />
                      </div>
                      {slotForm.date && (
                        <div className="text-[11px] text-primary font-medium mt-1 text-center bg-primary/10 py-1 rounded-full border border-primary/20">
                          Selected: {format(new Date(slotForm.date), "PPP")}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/60">Start Time</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="HH:mm"
                          value={getDisplayTime(slotForm.startTime).time}
                          onChange={(e) => handleTimeChange("start", e.target.value, "time")}
                          className="bg-white/5 border-white/10 text-white flex-1"
                        />
                        <Select 
                          value={getDisplayTime(slotForm.startTime).period} 
                          onValueChange={(val) => handleTimeChange("start", val, "period")}
                        >
                          <SelectTrigger className="w-20 bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60">End Time</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="HH:mm"
                          value={getDisplayTime(slotForm.endTime).time}
                          onChange={(e) => handleTimeChange("end", e.target.value, "time")}
                          className="bg-white/5 border-white/10 text-white flex-1"
                        />
                        <Select 
                          value={getDisplayTime(slotForm.endTime).period} 
                          onValueChange={(val) => handleTimeChange("end", val, "period")}
                        >
                          <SelectTrigger className="w-20 bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSlotSubmit} className="flex-1">
                        <Plus className="h-4 w-4 mr-2" />
                        {editingSlotId ? "Update Slot" : "Create Slot"}
                      </Button>
                      {editingSlotId && (
                        <Button variant="outline" onClick={resetSlotForm}>Cancel</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Your Slots</CardTitle>
                    <Button size="sm" variant="outline" onClick={handleGenerateDefaultSlots} className="gap-2">
                      <Zap className="h-4 w-4" />
                      Generate 10 AM – 4 PM
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                      Create a single slot for a specific date and time, or use the "Generate" button to quickly create a full day of slots (10 AM – 4 PM) for tomorrow.
                    </div>
                    {slots.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">No slots created yet.</p>
                        <Button size="sm" onClick={handleGenerateDefaultSlots} variant="outline" className="gap-2">
                          <Zap className="h-4 w-4" />
                          Generate Standard Slots
                        </Button>
                      </div>
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto">
                        {slots.map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between gap-4 border rounded-lg p-3 hover:bg-muted/50 transition mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <div className="font-medium text-sm">{formatDate(slot.date)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatSlot(slot.startTime, slot.endTime)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={slot.isBooked ? "secondary" : "outline"} className="text-xs">
                                {slot.isBooked ? "Booked" : "Available"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSlot(slot)}
                                disabled={slot.isBooked}
                                className="h-8 w-8 p-0"
                              >
                                ✎
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSlot(slot.id)}
                                disabled={slot.isBooked}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Booked Consultations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                  ) : (
                    bookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <p className="font-semibold">{booking.clientName}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.date} | {booking.timeSlot}
                            </p>
                          </div>
                          <Badge variant={booking.status === "approved" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"}>
                            {booking.status}
                          </Badge>
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-muted-foreground mb-3">{booking.notes}</p>
                        )}
                        <p className="text-sm text-muted-foreground mb-3">
                          Payment:{" "}
                          <span className="font-medium capitalize text-foreground">
                            {booking.paymentStatus || "unpaid"}
                          </span>
                        </p>
                        {booking.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleBookingStatusChange(booking.id, "approved")}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBookingStatusChange(booking.id, "cancelled")}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Consultation Requests Tab */}
            <TabsContent value="requests" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Consultation Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending consultation requests.</p>
                    ) : (
                      pendingBookings.map((request) => (
                        <div key={request.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3 gap-4">
                            <div>
                              <p className="font-semibold">{request.clientName}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.date} | {request.timeSlot}
                              </p>
                            </div>
                            <Badge variant="secondary">New</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            {request.notes || "Consultation booking request awaiting your response."}
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Payment:{" "}
                            <span className="font-medium capitalize text-foreground">
                              {request.paymentStatus || "unpaid"}
                            </span>
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleBookingStatusChange(request.id, "approved")}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBookingStatusChange(request.id, "cancelled")}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Earnings Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">This Month</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.thisMonthEarnings)}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-success" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Earnings</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
                        </div>
                        <IndianRupee className="h-8 w-8 text-success" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Consultation Earnings</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.consultationEarnings)}</p>
                        </div>
                        <IndianRupee className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Case Earnings</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.caseEarnings)}</p>
                        </div>
                        <IndianRupee className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed Consultations</p>
                          <p className="text-2xl font-bold">{earningsData.consultationsCount || 0}</p>
                        </div>
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed Cases</p>
                          <p className="text-2xl font-bold">{earningsData.casesCount || 0}</p>
                        </div>
                        <Briefcase className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span>Membership Plans</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic Plan Column */}
                      <div className="border rounded-xl p-4 flex flex-col justify-between bg-muted/10 relative">
                        {currentUser?.membershipTier !== "premium" && (
                          <Badge className="absolute top-2 right-2 bg-primary text-white text-[10px] font-bold">
                            Active
                          </Badge>
                        )}
                        <div>
                          <p className="font-bold text-lg">Basic Plan</p>
                          <p className="text-2xl font-black mt-1 text-foreground">₹0 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                            <li className="flex items-center gap-1.5">✕ 10% Platform Commission</li>
                            <li className="flex items-center gap-1.5">✓ Standard Visibility</li>
                            <li className="flex items-center gap-1.5">✓ Standard Consultation Slots</li>
                            <li className="flex items-center gap-1.5">✓ Case Management</li>
                          </ul>
                        </div>
                        {currentUser?.membershipTier === "premium" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4 w-full text-xs"
                            onClick={handleDowngradeToBasic}
                          >
                            Downgrade to Basic
                          </Button>
                        )}
                      </div>

                      {/* Premium Plan Column */}
                      <div className="border border-yellow-500/30 rounded-xl p-4 flex flex-col justify-between bg-yellow-500/5 relative shadow-sm">
                        {currentUser?.membershipTier === "premium" && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500 text-slate-900 text-[10px] font-extrabold hover:bg-yellow-500">
                            Active
                          </Badge>
                        )}
                        <div>
                          <p className="font-bold text-lg text-yellow-600 flex items-center gap-1">
                            Premium Plan
                          </p>
                          <p className="text-2xl font-black mt-1 text-foreground">₹999 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                          <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                            <li className="flex items-center gap-1.5 font-semibold text-green-600 dark:text-green-400">✓ 0% Platform Commission</li>
                            <li className="flex items-center gap-1.5">✓ Featured Search Listing (Top placements!)</li>
                            <li className="flex items-center gap-1.5">✓ VIP Premium Profile Badge</li>
                            <li className="flex items-center gap-1.5">✓ Priority Customer Support</li>
                          </ul>
                        </div>
                        {currentUser?.membershipTier !== "premium" ? (
                          <Button 
                            size="sm" 
                            className="mt-4 w-full bg-yellow-500 text-slate-950 hover:bg-yellow-600 font-bold text-xs"
                            onClick={handleUpgradeToPremium}
                          >
                            Upgrade to Premium
                          </Button>
                        ) : (
                          <div className="mt-4 text-center text-xs text-yellow-600 font-bold bg-yellow-500/10 py-1.5 rounded-lg border border-yellow-500/20">
                            You possess all Premium perks!
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Fees & Pricing Tab */}
            <TabsContent value="fees" className="mt-6">
              <div className="max-w-2xl mx-auto">
                <Card className="border-primary/20 shadow-lg">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Manage Your Fees</CardTitle>
                    <p className="text-muted-foreground">Set your standard professional charges</p>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Consultation Fee */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <MessageSquare className="h-5 w-5" />
                          <span>Consultation Fee</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">INR</span>
                          <Input 
                            type="number"
                            placeholder="e.g. 500"
                            className="pl-12 text-lg font-bold"
                            defaultValue={currentUser?.hourlyRate}
                            id="hourlyRateInput"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Fixed fee for one consultation.</p>
                      </div>

                      {/* Base Case Fee */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <Briefcase className="h-5 w-5" />
                          <span>General Case Fee</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">INR</span>
                          <Input 
                            type="number"
                            placeholder="e.g. 10000"
                            className="pl-12 text-lg font-bold"
                            defaultValue={currentUser?.baseCaseFee || 5000}
                            id="caseFeeInput"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Starting fee for new cases.</p>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-12 text-lg gradient-primary"
                      onClick={async () => {
                        const hr = document.getElementById('hourlyRateInput').value;
                        const cf = document.getElementById('caseFeeInput').value;
                        try {
                          await updateLawyerProfile({ 
                            hourlyRate: Number(hr), 
                            baseCaseFee: Number(cf) 
                          });
                          toast.success("Fee structure updated!");
                          setTimeout(() => window.location.reload(), 1000);
                        } catch (err) {
                          toast.error("Failed to update fees");
                        }
                      }}
                    >
                      Save Fee Structure
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Hearing History Tab */}
            <TabsContent value="hearings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hearing History</CardTitle>
                </CardHeader>
                <CardContent>
                  {lawyerCases.flatMap((c) => c.hearingDates || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hearings in history.</p>
                  ) : (
                    <div className="space-y-4">
                      {lawyerCases.flatMap((caseItem) =>
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
                            <div className="flex items-center gap-2">
                              {hearing.status !== "completed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-sm"
                                  onClick={() => handleUpdateHearingStatus(caseItem.id, hearing.id, "completed")}
                                >
                                  Mark Completed
                                </Button>
                              )}
                              <Badge className={
                                hearing.status === "completed"
                                  ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 shrink-0"
                                  : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 shrink-0"
                              } variant="outline">
                                {hearing.status === "completed" ? "Completed" : "Scheduled"}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab — real data from currentUser (synced via hydrateUser) */}
            <TabsContent value="profile" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Consultation Fee</span>
                      <span className="font-bold text-lg text-primary">INR {currentUser?.hourlyRate || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">General Case Fee</span>
                      <span className="font-bold text-lg text-primary">INR {currentUser?.baseCaseFee || 5000}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{currentUser?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mobile No</span>
                      <span className="font-medium">{currentUser?.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{currentUser?.email || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{currentUser?.location || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bar ID</span>
                      <span className="font-medium">{currentUser?.barId || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Experience</span>
                      <span className="font-medium">{currentUser?.experience ?? 0} years</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Specialization</span>
                      <span className="font-medium text-right">
                        {currentUser?.specialization?.join(", ") || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Verification</span>
                      <Badge variant={currentUser?.verified ? "default" : "secondary"}>
                        {currentUser?.verified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {currentUser?.bio || "No bio added yet."}
                    </p>
                    <Button className="mt-4" onClick={() => navigate("/settings")}>
                      Edit Profile & Bio
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LawyerDashboard;
