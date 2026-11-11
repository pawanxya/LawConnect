import { Link, useLocation, useNavigate } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { Scale, ShieldCheck, UserRound, BriefcaseBusiness } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";
import { toast } from "sonner";
import { useState } from "react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signin } = useAuth();
  const [loadingRole, setLoadingRole] = useState("");
  const showLocalTestLogins = import.meta.env.DEV;

  const demoAccounts = [
    { role: "client", label: "Client", email: "client@example.com", password: "client123", icon: UserRound },
    { role: "lawyer", label: "Lawyer", email: "lawyer@example.com", password: "lawyer123", icon: BriefcaseBusiness },
    { role: "admin", label: "Admin", email: "admin@lawconnect.com", password: "admin123", icon: ShieldCheck },
  ];

  const signInAsDemo = async (account) => {
    setLoadingRole(account.role);
    try {
      await signin(account);
      toast.success(`Signed in as local ${account.label}.`);
      navigate(location.state?.from?.pathname || getDashboardPath(account.role), { replace: true });
    } catch (error) {
      toast.error(error.message || "Demo account could not sign in. Start the backend and try again.");
    } finally {
      setLoadingRole("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-muted/40">
      <Link to="/" className="flex items-center gap-2 mb-6">
        <Scale className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">LawConnect</span>
      </Link>

      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your LawConnect account</CardDescription>
        </CardHeader>

        <div className="p-4 flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
          />
        </div>

        {showLocalTestLogins ? (
          <div className="mx-6 mb-4 rounded-xl border bg-muted/50 p-4">
            <p className="text-sm font-semibold">Local testing accounts</p>
            <p className="mt-1 text-xs text-muted-foreground">Use separate browser profiles or an incognito window to test client–lawyer chat in real time.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <Button key={account.role} variant="outline" size="sm" disabled={Boolean(loadingRole)} onClick={() => signInAsDemo(account)}>
                    <Icon className="mr-1.5 h-4 w-4" />
                    {loadingRole === account.role ? "Signing in…" : account.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="text-center pb-6 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Create account
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
