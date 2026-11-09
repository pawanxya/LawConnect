import { Facebook, Instagram, Linkedin, Scale, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { currentUser } = useAuth();
  const isLawyer = currentUser?.role === "lawyer";

  return (
    <footer className="bg-muted/50 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link
              to="/"
              className="mb-4 flex items-center gap-2 text-xl font-bold"
            >
              <Scale className="h-6 w-6 text-primary" />
              <span>LAWCONNECT</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting clients with experienced lawyers for better legal
              outcomes.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">{isLawyer ? "Lawyer Tools" : "For Clients"}</h3>
            <ul className="space-y-2 text-sm">
              {isLawyer ? (
                <>
                  <li>
                    <Link
                      to="/lawyer/dashboard"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/bookings"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      Manage Slots
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/bookings"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      Requests
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/bookings"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      Earnings
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      to="/lawyers"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      Book Consultation
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/bookings"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      History
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/profile"
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      Profile
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/pricing"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to={isLawyer ? "/lawyer/dashboard" : "/signup"}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {isLawyer ? "Dashboard" : "Sign Up"}
                </Link>
              </li>
              <li>
                <Link
                  to={isLawyer ? "/bookings" : "/login"}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {isLawyer ? "Requests" : "Login"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Connect</h3>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit our Facebook page"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit our X profile"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit our LinkedIn page"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit our Instagram page"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} LAWCONNECT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
