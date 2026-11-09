import { Link } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import { Scale } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Login = () => {
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
