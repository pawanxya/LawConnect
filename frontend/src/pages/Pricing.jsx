import { Link } from "react-router-dom";
import { ArrowRight, Check, Crown, FileText, MessageSquare, Search, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { createSubscriptionOrder, verifySubscriptionPayment, updateMembershipTier } from "@/lib/dataService";

const clientPlans = [
  {
    tier: "basic",
    name: "Basic",
    price: 0,
    description: "For first-time users who want to browse lawyers and request consultations.",
    features: [
      "Search and filter verified lawyers",
      "View lawyer profiles and fees",
      "Book 1 active consultation request at a time",
      "Basic case timeline access",
    ],
  },
  {
    tier: "plus",
    name: "Client Plus",
    price: 499,
    description: "For clients actively consulting lawyers and managing more than one legal matter.",
    recommended: true,
    features: [
      "Unlimited consultation requests",
      "Priority support for booking issues",
      "Secure lawyer messaging after booking",
      "Document uploads and shared records",
      "Booking and notification history tracking",
    ],
  },
];

const lawyerPlans = [
  {
    tier: "basic",
    name: "Basic Plan",
    price: 0,
    description: "Standard listing and case management for all legal practitioners.",
    features: [
      "Standard search visibility",
      "10% Platform commission on bookings",
      "Standard consultation slots",
      "Complete case management tools",
    ],
  },
  {
    tier: "premium",
    name: "Premium Plan",
    price: 999,
    description: "Featured positioning and maximum platform advantages.",
    recommended: true,
    features: [
      "0% Platform Commission (Keep 100% of fee!)",
      "Featured Search Listing (Top placement)",
      "VIP Premium Profile Badge",
      "Priority customer support",
    ],
  },
];

const featureHighlights = [
  {
    icon: Search,
    title: "Lawyer discovery",
    text: "Search by specialization, city, reviews, and fee range.",
  },
  {
    icon: MessageSquare,
    title: "Secure messaging",
    text: "Chat is unlocked after consultation booking to keep conversations relevant.",
  },
  {
    icon: FileText,
    title: "Booking & case records",
    text: "Track consultations, case updates, and shared documents from one account.",
  },
  {
    icon: Shield,
    title: "Verified ecosystem",
    text: "Lawyer profiles, reviews, and consultation flows stay aligned with the platform.",
  },
];

const formatPrice = (price) => (price === 0 ? "Free" : `Rs ${price.toLocaleString("en-IN")}/month`);

const Pricing = () => {
  const { currentUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const defaultTab = currentUser?.role === "lawyer" ? "lawyer" : "client";

  const handleSubscribe = async (plan) => {
    if (!currentUser) {
      toast.error("Please login to choose a membership plan.");
      return;
    }

    if (plan.price === 0) {
      try {
        setIsUpdating(true);
        await updateMembershipTier(plan.tier);
        toast.success(`Successfully switched to ${plan.name}!`);
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (err) {
        toast.error("Failed to update plan.");
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // Razorpay checkout flow for premium or plus subscription
    if (plan.tier === "premium" || plan.tier === "plus") {
      try {
        setIsUpdating(true);
        const order = await createSubscriptionOrder(plan.tier);
        
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: plan.tier === "premium" ? "LawConnect Premium" : "Client Plus Plan",
          description: plan.tier === "premium" ? "1 Month Premium Membership Subscription" : "1 Month Client Plus Membership Subscription",
          order_id: order.orderId,
          handler: async (response) => {
            try {
              const verificationPayload = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan.tier,
              };
              await verifySubscriptionPayment(verificationPayload);
              toast.success(`Successfully upgraded to ${plan.name}!`);
              setTimeout(() => {
                window.location.href = "/";
              }, 1500);
            } catch (err) {
              toast.error(err.message || "Verification failed. Please contact support.");
            } finally {
              setIsUpdating(false);
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
        toast.error(error.message || `Failed to initiate ${plan.name} upgrade.`);
        setIsUpdating(false);
      }
      return;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <section className="gradient-hero py-16">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4">Simple Legal Platform Pricing</Badge>
            <h1 className="mb-4 text-5xl font-bold">Pricing that fits how LAWCONNECT is actually used</h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
              Choose a client or lawyer plan based on booking volume, communication needs, and profile visibility.
            </p>
            <Link to="/lawyers">
              <Button size="lg" className="gap-2">
                Browse Lawyers <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="mb-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featureHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardContent className="p-6">
                    <Icon className="mb-4 h-10 w-10 text-primary" />
                    <h3 className="mb-2 font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
          {currentUser ? (
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Available Plans for {currentUser.role === 'lawyer' ? 'Lawyers' : 'Clients'}</h2>
              <p className="text-muted-foreground mt-2">Choose the best plan for your legal practice and needs.</p>
            </div>
          ) : (
            <TabsList className="mx-auto mb-12 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="client">For Clients</TabsTrigger>
              <TabsTrigger value="lawyer">For Lawyers</TabsTrigger>
            </TabsList>
          )}

          {( !currentUser || currentUser.role === 'client' ) && (
            <TabsContent value="client" forceMount={currentUser?.role === 'client' ? true : undefined}>
              <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
                {clientPlans.map((plan) => (
                  <Card 
                    key={plan.tier} 
                    className={`relative transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                      plan.recommended 
                        ? "border-primary/50 bg-primary/[0.02] shadow-md shadow-primary/5" 
                        : "border-border bg-card/40"
                    }`}
                  >
                    {plan.recommended ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-primary to-primary-hover border-none text-white font-extrabold shadow-md py-1 px-3">
                          <Crown className="mr-1 h-3.5 w-3.5" />
                          Recommended
                        </Badge>
                      </div>
                    ) : null}
                    <CardHeader className="pt-8">
                      <CardTitle className="text-2xl font-extrabold tracking-tight">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[40px] mt-2">{plan.description}</CardDescription>
                      <div className="pt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">
                          {plan.price === 0 ? "Free" : `₹${plan.price}`}
                        </span>
                        {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-8">
                      <ul className="mb-6 space-y-3 min-h-[160px]">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full py-6 font-bold text-sm tracking-wide transition-all ${
                          plan.recommended 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" 
                            : "variant-outline"
                        }`}
                        variant={plan.recommended ? "default" : "outline"}
                        disabled={isUpdating || currentUser?.membershipTier === plan.tier}
                        onClick={() => handleSubscribe(plan)}
                      >
                        {!currentUser 
                          ? (plan.price === 0 ? "Start Free" : "Join Now")
                          : (currentUser?.membershipTier === plan.tier 
                            ? "Current Plan" 
                            : plan.price === 0 ? "Start Free" : "Upgrade Plan")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {( !currentUser || currentUser.role === 'lawyer' ) && (
            <TabsContent value="lawyer" forceMount={currentUser?.role === 'lawyer' ? true : undefined}>
              <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
                {lawyerPlans.map((plan) => (
                  <Card 
                    key={plan.tier} 
                    className={`relative transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                      plan.recommended 
                        ? "border-yellow-500/50 bg-yellow-500/[0.02] shadow-md shadow-yellow-500/5" 
                        : "border-border bg-card/40"
                    }`}
                  >
                    {plan.recommended ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 border-none text-slate-900 font-extrabold shadow-md py-1 px-3">
                          <Crown className="mr-1 h-3.5 w-3.5 fill-slate-900" />
                          Recommended
                        </Badge>
                      </div>
                    ) : null}
                    <CardHeader className="pt-8">
                      <CardTitle className={`text-2xl font-extrabold tracking-tight ${plan.recommended ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="min-h-[40px] mt-2">{plan.description}</CardDescription>
                      <div className="pt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">
                          {plan.price === 0 ? "Free" : `₹${plan.price}`}
                        </span>
                        {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-8">
                      <ul className="mb-6 space-y-3 min-h-[160px]">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full py-6 font-bold text-sm tracking-wide transition-all ${
                          plan.recommended 
                            ? "bg-yellow-500 text-slate-950 hover:bg-yellow-600 shadow-lg shadow-yellow-500/20" 
                            : "variant-outline"
                        }`}
                        variant={plan.recommended ? "default" : "outline"}
                        disabled={isUpdating || currentUser?.membershipTier === plan.tier}
                        onClick={() => handleSubscribe(plan)}
                      >
                        {!currentUser 
                          ? (plan.price === 0 ? "Join as Lawyer" : "Upgrade Practice")
                          : (currentUser?.membershipTier === plan.tier 
                            ? "Current Plan" 
                            : plan.price === 0 ? "Stay on Free Plan" : "Upgrade Plan")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {currentUser?.role === 'lawyer' && (
                <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Your current consultation fee</CardTitle>
                      <CardDescription>
                        This fee is shown to clients when they open your profile and booking slots.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <div className="text-5xl font-bold text-foreground">
                          Rs {Number(currentUser?.hourlyRate || 0).toLocaleString("en-IN")}
                          <span className="text-lg font-normal text-muted-foreground">/hr</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {currentUser?.specialization?.join(", ") ||
                            "Update specialization and fee from your lawyer dashboard/profile."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to="/lawyer/dashboard">
                          <Button>Manage Slots</Button>
                        </Link>
                        <Link to="/settings">
                          <Button variant="outline">Open Settings</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Who should upgrade?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <p>Choose Premium if you regularly receive consultation requests and want to keep 100% of your earnings with 0% platform commission.</p>
                      <p>Basic Plan is enough if you only want a standard presence and occasional case management.</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}
          </Tabs>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;
