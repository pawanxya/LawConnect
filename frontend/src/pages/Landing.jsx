import { Link, useNavigate } from "react-router-dom";
import { Search, MessageSquare, FileText, Shield, Star, Users, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";
import heroImage from "@/assets/hero-legal.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const navigateProtected = (targetPath, allowedRoles) => {
    if (!currentUser) {
      toast.info("Please login to continue.");
      navigate("/login", { state: { from: { pathname: targetPath } } });
      return;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      navigate(getDashboardPath(currentUser.role));
      return;
    }

    navigate(targetPath);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section id="main-content" className="gradient-hero py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-4">Verified Legal Marketplace</Badge>
              <h1 className="mb-6 text-5xl font-bold leading-tight lg:text-6xl">
                Book verified lawyers and manage your legal work in one place
              </h1>
              <p className="mb-8 text-xl text-muted-foreground">
                Search by specialization, book consultation slots, chat securely, and track your case updates without
                switching between tools.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/lawyers">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto">
                    Find a Lawyer
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Pricing
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                <div>
                  <div className="text-3xl font-bold text-primary">2000+</div>
                  <div className="text-sm text-muted-foreground">Verified lawyers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">15000+</div>
                  <div className="text-sm text-muted-foreground">Consultations managed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">24x7</div>
                  <div className="text-sm text-muted-foreground">Platform access</div>
                </div>
              </div>
            </div>

            <div>
              <img src={heroImage} alt="Legal consultation" className="rounded-2xl shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold">Built for real legal workflows</h2>
            <p className="text-xl text-muted-foreground">
              Everything on LAWCONNECT is focused on lawyer discovery, booking, messaging, and case progress.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/lawyers" className="block">
              <Card className="h-full border-2 transition-all hover:border-primary hover:shadow-lg">
                <CardContent className="p-6">
                  <Search className="mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Lawyer Search</h3>
                  <p className="text-muted-foreground">
                    Filter lawyers by practice area, city, experience, consultation fee, and reviews.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/lawyers" className="block">
              <Card className="h-full border-2 transition-all hover:border-primary hover:shadow-lg">
                <CardContent className="p-6">
                  <Shield className="mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Verified Profiles</h3>
                  <p className="text-muted-foreground">
                    Lawyers list bar details, specialization, ratings, and available consultation slots.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link
              to="/messages"
              className="block"
              onClick={(e) => {
                e.preventDefault();
                navigateProtected("/messages", ["client", "lawyer"]);
              }}
            >
              <Card className="h-full border-2 transition-all hover:border-primary hover:shadow-lg">
                <CardContent className="p-6">
                  <MessageSquare className="mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Secure Messaging</h3>
                  <p className="text-muted-foreground">
                    Chat after consultation booking, share documents, and receive real-time updates.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link
              to="/client/dashboard"
              className="block"
              onClick={(e) => {
                e.preventDefault();
                navigateProtected("/client/dashboard", ["client"]);
              }}
            >
              <Card className="h-full border-2 transition-all hover:border-primary hover:shadow-lg">
                <CardContent className="p-6">
                  <FileText className="mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Case Tracking</h3>
                  <p className="text-muted-foreground">
                    Follow status changes, timeline updates, documents, and booked consultations from your dashboard.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold">How LAWCONNECT works</h2>
            <p className="text-xl text-muted-foreground">Simple flow for clients and lawyers.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-2xl font-bold text-white">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold">Search and compare</h3>
              <p className="text-muted-foreground">
                Browse verified lawyer profiles with filters for legal domain, city, fee, and experience.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-2xl font-bold text-white">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold">Book consultation</h3>
              <p className="text-muted-foreground">
                Choose an available slot, submit your request, and receive booking updates in real time.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-2xl font-bold text-white">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold">Manage communication</h3>
              <p className="text-muted-foreground">
                Message securely, share documents, and track case timelines from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 text-center md:grid-cols-4">
            <div>
              <Users className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="mb-2 text-4xl font-bold">2000+</div>
              <div className="text-muted-foreground">Active lawyer profiles</div>
            </div>
            <div>
              <Star className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="mb-2 text-4xl font-bold">4.8</div>
              <div className="text-muted-foreground">Average user rating</div>
            </div>
            <div>
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="mb-2 text-4xl font-bold">98%</div>
              <div className="text-muted-foreground">Booking confirmation success</div>
            </div>
            <div>
              <FileText className="mx-auto mb-4 h-12 w-12 text-primary" />
              <div className="mb-2 text-4xl font-bold">15k+</div>
              <div className="text-muted-foreground">Case and consultation records</div>
            </div>
          </div>
        </div>
      </section>

      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white">Need legal help or want to join as a lawyer?</h2>
          <p className="mb-8 text-xl text-white/90">Start with lawyer discovery, booking, and secure communication.</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/signup">
              <Button variant="secondary" size="lg">
                Sign Up as Client
              </Button>
            </Link>
            <Link to="/lawyer/signup">
              <Button
                variant="outline"
                size="lg"
                className="border-white bg-white/10 text-white hover:bg-white hover:text-primary"
              >
                Join as Lawyer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
