import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { socket } from "@/lib/socketClient";
import { fetchBookings, cancelBooking, updateBookingStatus, createCaseRequest, payForBooking } from "@/lib/dataService";
import { loadRazorpayScript, createRazorpayOrder, verifyRazorpayPayment } from "@/lib/paymentService";
import { CaseBookingDialog } from "@/components/CaseBookingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, IndianRupee, Briefcase, CreditCard, CheckCircle } from "lucide-react";
import { ReviewModal } from "@/components/ReviewModal";

export default function Bookings() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [payingBookingId, setPayingBookingId] = useState("");

  const sortedBookings = [...bookings].sort((a, b) => {
    const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
  });

  const getStatusVariant = (status) => {
    if (status === "approved" || status === "completed") {
      return "default";
    }

    if (status === "cancelled") {
      return "destructive";
    }

    return "secondary";
  };

  const loadBookings = async () => {
    try {
      const data = await fetchBookings();
      setBookings(data || []);
    } catch (e) {
      toast.error(e.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) loadBookings();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.connect();
    socket.emit("join", currentUser.id);

    const handleBookingUpdated = (booking) => {
      setBookings((prev) => {
        const exists = prev.some((item) => item.id === booking.id);
        if (exists) {
          return prev.map((item) => (item.id === booking.id ? booking : item));
        }
        return [booking, ...prev];
      });
    };

    socket.on("booking_updated", handleBookingUpdated);

    return () => {
      socket.off("booking_updated", handleBookingUpdated);
    };
  }, [currentUser?.id]);

  const handleCancelBooking = async (id) => {
    try {
      await cancelBooking(id);
      toast.success("Booking cancelled.");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
      );
    } catch (e) {
      toast.error(e.message || "Failed to cancel booking");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const updatedBooking = await updateBookingStatus(id, status);
      toast.success(`Booking ${status}.`);
      setBookings((prev) =>
        prev.map((booking) => (booking.id === id ? updatedBooking : booking)),
      );
    } catch (e) {
      toast.error(e.message || "Failed to update booking");
    }
  };

  const handlePayNow = async (booking) => {
    try {
      setPayingBookingId(booking.id);
      
      // 1. Load Razorpay Script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Please check your internet.");
        return;
      }

      // 2. Create Order on Backend
      const orderData = await createRazorpayOrder({
        amount: booking.amount,
        bookingId: booking.id
      });

      // 3. Open Razorpay Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LawConnect",
        description: `Payment for consultation with ${booking.lawyerName}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            // 4. Verify Payment
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id
            });

            toast.success("Payment successful! Your case has been started.");
            loadBookings(); // Refresh list
          } catch (err) {
            toast.error(err.message || "Verification failed.");
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
        modal: {
          ondismiss: () => {
            setPayingBookingId("");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      toast.error(error.message || "Failed to initiate payment.");
    } finally {
      setPayingBookingId("");
    }
  };

  const handleBookForCase = (booking) => {
    if (currentUser?.role !== "client") {
      toast.error("Only clients can book a lawyer for a case.");
      return;
    }
    if (currentUser?.membershipTier !== "plus") {
      toast.error("To register or add a case, you must purchase the Client Plus plan. Redirecting to Pricing...");
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 1500);
      return;
    }
    setSelectedBooking(booking);
    setCaseDialogOpen(true);
  };

  const handleCreateCase = async (caseData) => {
    if (!selectedBooking) return;

    try {
      setIsCreatingCase(true);
      await createCaseRequest({
        lawyerId: selectedBooking.lawyerId,
        title: caseData.caseTitle,
        description: caseData.caseDescription,
      });
      toast.success("Case booked successfully! You can now manage case details from your dashboard.");
      setCaseDialogOpen(false);
      setSelectedBooking(null);

      // Refresh bookings
      const updated = await fetchBookings();
      setBookings(updated || []);

      setTimeout(() => {
        window.location.href = "/client/dashboard";
      }, 1200);
    } catch (error) {
      toast.error(error.message || "Failed to create case.");
    } finally {
      setIsCreatingCase(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Consultation History</h1>
        <p className="text-muted-foreground mb-6">
          Review your pending requests, approved meetings, completed consultations, and cancellations.
        </p>
        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <Card>
             <CardContent className="p-6 text-center text-muted-foreground">
                No bookings found. You can book a consultation from a lawyer's profile.
             </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBookings.map((booking) => (
              <Card key={booking.id} className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Consultation with {currentUser.role === "lawyer" ? booking.clientName : booking.lawyerName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant={getStatusVariant(booking.status)}>
                    {booking.status}
                  </Badge>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" /> <span>{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> <span>{booking.timeSlot}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                    <IndianRupee className="h-4 w-4 text-primary" /> <span>{booking.amount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Payment:</span>{" "}
                    <span className="font-medium capitalize">{booking.paymentStatus || "unpaid"}</span>
                  </div>

                  {booking.notes && (
                    <div className="bg-muted p-2 rounded text-sm mt-2">
                       <span className="font-semibold">Notes:</span> {booking.notes}
                    </div>
                  )}

                  {currentUser.role === "client" && ["pending", "approved"].includes(booking.status) && (
                    <div className="space-y-2">
                      {booking.paymentStatus !== "paid" ? (
                        <Button
                          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                          disabled={payingBookingId === booking.id}
                          onClick={() => handlePayNow(booking)}
                        >
                          <CreditCard className="h-4 w-4" />
                          {payingBookingId === booking.id ? "Processing..." : "Pay Now"}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                          <CheckCircle className="h-4 w-4" />
                          <span>Payment Completed</span>
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancel Booking
                      </Button>
                    </div>
                  )}

                  {currentUser.role === "client" && booking.status === "completed" && !booking.caseId && (
                    <Button
                      size="sm"
                      className="w-full mt-4 gap-2"
                      onClick={() => handleBookForCase(booking)}
                      variant="outline"
                    >
                      <Briefcase className="h-4 w-4" />
                      Book for a Case
                    </Button>
                  )}

                  {currentUser.role === "client" && booking.caseId && (
                    <div className="text-sm text-success pt-2 border-t">
                      Linked to a case
                    </div>
                  )}

                  {currentUser.role === "client" && booking.status === "completed" && (
                    <div className="mt-4 pt-4 border-t">
                      <ReviewModal
                        lawyerId={booking.lawyerId}
                        lawyerName={booking.lawyerName}
                        bookingId={booking.id}
                        onReviewSubmitted={() => loadBookings()}
                      />
                    </div>
                  )}

                  {currentUser.role === "lawyer" && booking.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button size="sm" onClick={() => handleStatusUpdate(booking.id, "approved")}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {currentUser.role === "lawyer" && ["approved", "paid"].includes(booking.status) && (
                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => handleStatusUpdate(booking.id, "completed")}
                    >
                      Mark as Completed
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Case Booking Dialog */}
        {selectedBooking && (
          <CaseBookingDialog
            open={caseDialogOpen}
            onOpenChange={(open) => {
              setCaseDialogOpen(open);
              if (!open) setSelectedBooking(null);
            }}
            lawyerName={selectedBooking.lawyerName}
            bookingId={selectedBooking.id}
            onConfirm={handleCreateCase}
            isSubmitting={isCreatingCase}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
