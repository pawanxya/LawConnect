import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";
import { Scale } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signin } = useAuth();
  const [email, setEmail] = useState(location.state?.prefill?.email || "");
  const [password, setPassword] = useState(location.state?.prefill?.password || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await signin({ email, password, role: "admin" });
      toast.success("Admin login successful!");
      const redirectPath = location.state?.from?.pathname;
      navigate(redirectPath || getDashboardPath("admin"), { replace: true });
    } catch (error) {
      toast.error(error.message || "Unable to login as admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="main-content"
      className="min-h-screen gradient-hero flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 font-bold text-2xl mb-8"
        >
          <Scale className="h-8 w-8 text-primary" />
          <span>LAWCONNECT</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Restricted access for platform administration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@lawconnect.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter your admin password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Login as Admin"}
              </Button>
            </form>
            <div className="mt-4 rounded-md border p-3 text-xs text-muted-foreground">
              Admin access is restricted to approved platform administrators.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
