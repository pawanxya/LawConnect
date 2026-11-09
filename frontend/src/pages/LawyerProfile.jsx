import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ConsultationBookingDialog } from "@/components/ConsultationBookingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Star,
  Briefcase,
  Award,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { fetchBookings, fetchLawyerById, createBooking } from "@/lib/dataService";
import { 
  loadRazorpayScript, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from "@/lib/paymentService";
import { socket } from "@/lib/socketClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const LawyerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [lawyer, setLawyer] = useState(null);
  const [lawyerReviews, setLawyerReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Load Razorpay Script
    const loadScript = async () => {
      try {
        const res = await loadRazorpayScript();
        if (!res) {
          console.error("Razorpay SDK failed to load.");
        }
      } catch (err) {
        console.error("Error loading Razorpay:", err);
      }
    };
    loadScript();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLawyer = async () => {
      try {
        const [payload, bookingData] = await Promise.all([
          fetchLawyerById(id),
          fetchBookings().catch(() => []),
        ]);
        if (isMounted) {
          setLawyer(payload.lawyer || null);
          setLawyerReviews(payload.reviews || []);
          setBookings(bookingData || []);
        }
      } catch (error) {
        toast.error(error.message || "Unable to load lawyer profile.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadLawyer();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    socket.connect();

    const handleLawyerSlotsUpdated = (payload) => {
      if (!payload) return;

      const matchesLawyer =
        payload.lawyerId === id ||
        payload.userId === id ||
        payload.lawyerId === lawyer?.id ||
        payload.userId === lawyer?.userId;

      if (!matchesLawyer) return;

      setLawyer((prev) =>
        prev
          ? {
              ...prev,
              consultationSlots: payload.slots || [],
            }
          : prev,
      );
    };

    socket.on("lawyer_slots_updated", handleLawyerSlotsUpdated);

    return () => {
      socket.off("lawyer_slots_updated", handleLawyerSlotsUpdated);
    };
  }, [id, lawyer?.id, lawyer?.userId]);

  const isClient = currentUser?.role === "client";
  const availableSlots = useMemo(
    () =>
      (lawyer?.consultationSlots || []).filter(
        (slot) => !slot.isBooked && slot.status !== "booked" && slot.date,
      ),
    [lawyer?.consultationSlots],
  );
  const canBookConsultation = isAuthenticated ? isClient : true;
  const hasBookedConsultation = useMemo(
    () =>
      bookings.some(
        (booking) =>
          booking.lawyerId === lawyer?.id && booking.status !== "cancelled",
      ),
    [bookings, lawyer?.id],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-8">Loading lawyer profile...</div>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-8">Lawyer not found.</div>
      </div>
    );
  }

  const handleBookConsultation = async (bookingData) => {
    const { slotId, date, timeSlot, notes } = bookingData;

    if (!isAuthenticated) {
      toast.error("Please login as a client to book a consultation.");
      navigate("/login", { state: { from: { pathname: `/lawyer/${id}` } } });
      return;
    }

    if (!isClient) {
      toast.error("Only client accounts can book consultations.");
      return;
    }

    if (!currentUser?.membershipTier || (currentUser.membershipTier !== "basic" && currentUser.membershipTier !== "plus")) {
      toast.error("Please choose a membership plan before booking a consultation.");
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 1500);
      return;
    }

    if (currentUser.membershipTier === "basic") {
      const activeBookingsCount = bookings.filter(b => b.status !== "cancelled").length;
      if (activeBookingsCount >= 1) {
        toast.error("Under the free Basic Plan, you can only book exactly 1 consultation. Please upgrade to Client Plus for unlimited bookings.");
        setTimeout(() => {
          window.location.href = "/pricing";
        }, 1500);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      const booking = await createBooking({
        lawyerId: lawyer.id,
        slotId,
        date,
        timeSlot,
        notes: notes || `Consultation with ${lawyer.name}`,
      });

      toast.success("Consultation requested successfully! Please complete payment from your bookings page.");
      setIsDialogOpen(false);
      navigate("/bookings"); 
    } catch (error) {
      toast.error(error.message || "Failed to book consultation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openBookingDialog = () => {
    if (!isAuthenticated) {
      toast.error("Please login as a client to book a consultation.");
      navigate("/login", { state: { from: { pathname: `/lawyer/${id}` } } });
      return;
    }

    if (!isClient) {
      toast.error("Only client accounts can book consultations.");
      return;
    }

    if (!currentUser?.membershipTier || (currentUser.membershipTier !== "basic" && currentUser.membershipTier !== "plus")) {
      toast.error("Please choose a membership plan before booking a consultation.");
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 1500);
      return;
    }

    if (currentUser.membershipTier === "basic") {
      const activeBookingsCount = bookings.filter(b => b.status !== "cancelled").length;
      if (activeBookingsCount >= 1) {
        toast.error("Under the free Basic Plan, you can only book exactly 1 consultation. Please upgrade to Client Plus for unlimited bookings.");
        setTimeout(() => {
          window.location.href = "/pricing";
        }, 1500);
        return;
      }
    }

    setIsDialogOpen(true);
  };
  const handleSendMessage = () => {
    if (!isAuthenticated) {
      toast.error("Please login first to message a lawyer.");
      navigate("/login", { state: { from: { pathname: `/lawyer/${id}` } } });
      return;
    }

    if (!hasBookedConsultation) {
      toast.error("Book a consultation first to unlock messaging.");
      return;
    }

    navigate("/messages", { state: { partnerId: lawyer.id } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="gradient-hero py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <img
                src={lawyer.avatar}
                alt={lawyer.name}
                className="w-32 h-32 rounded-full shadow-lg"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-4xl font-bold">{lawyer.name}</h1>
                      {lawyer.verified && (
                        <CheckCircle className="h-6 w-6 text-success" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {lawyer.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {lawyer.experience} years
                      </div>
                    </div>
                  </div>
                  {lawyer.membershipTier === "platinum" && (
                    <Badge className="gradient-premium text-lg px-4 py-2">
                      Platinum Member
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {lawyer.specialization.map((spec, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {spec}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">{lawyer.bio}</p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" onClick={openBookingDialog} disabled={isSubmitting}>
                    Book Consultation
                  </Button>
                  {hasBookedConsultation ? (
                    <Button size="lg" variant="outline" onClick={handleSendMessage}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  ) : (
                    <Button size="lg" variant="outline" onClick={handleSendMessage} disabled={!isAuthenticated}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Book to Message
                    </Button>
                  )}
                  <ConsultationBookingDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    lawyerName={lawyer.name}
                    slots={availableSlots}
                    onConfirm={handleBookConsultation}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {lawyer.bio} With extensive experience in{" "}
                    {lawyer.specialization.join(", ")}, I provide comprehensive
                    legal services to clients. My approach combines legal
                    expertise with personalized attention to ensure the best
                    outcomes for every case.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reviews ({lawyerReviews.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {lawyerReviews.map((review) => (
                      <div
                        key={review.id}
                        className="border-b pb-4 last:border-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold">
                              {review.clientName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {review.date}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? "text-accent fill-accent" : "text-muted-foreground"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-lg text-primary">₹ {lawyer.hourlyRate.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-muted-foreground">/consultation</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Standard Case Fee</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-lg text-primary">₹ {(lawyer.baseCaseFee || 5000).toLocaleString("en-IN")}</span>
                      <span className="text-xs text-muted-foreground">/case</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-accent fill-accent" />
                      <span className="font-semibold">{lawyer.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({lawyer.totalReviews})
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-semibold">
                      {lawyer.experience} years
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bar ID</span>
                    <span className="font-mono text-sm">{lawyer.barId}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reputation Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {lawyer.reputationScore}
                      </span>
                      <Award className="h-6 w-6 text-accent" />
                    </div>
                    <Progress value={lawyer.reputationScore} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Based on client reviews, case success rate, and response
                      time
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={`h-3 w-3 rounded-full ${lawyer.availability === "available" ? "bg-success" : "bg-destructive"}`}
                    />
                    <span className="capitalize">{lawyer.availability}</span>
                  </div>
                  {lawyer.consultationSlots &&
                    lawyer.consultationSlots.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold mb-2">
                          Consultation Slots:
                        </p>
                        <div className="space-y-2">
                          {lawyer.consultationSlots.map((slot, idx) => (
                            <div
                              key={idx}
                              className="text-sm p-2 bg-muted rounded"
                            >
                              <span className="font-medium">{slot.date || slot.day}</span>
                              <span className="text-muted-foreground ml-2">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {slot.isBooked ? "(Booked)" : "(Available)"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LawyerProfile;
