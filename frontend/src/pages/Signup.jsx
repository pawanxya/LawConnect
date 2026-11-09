import { useState } from "react";
import { Link } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";
import { Scale } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Signup = ({ initialTab = "client" }) => {
  const [activeRole, setActiveRole] = useState(initialTab);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-muted/40">
      <Link to="/" className="flex items-center gap-2 mb-6">
        <Scale className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">LawConnect</span>
      </Link>

      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join as a {activeRole === "lawyer" ? "Legal Professional" : "Client seeking legal counsel"}
          </CardDescription>

          <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="lawyer">Lawyer</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <div className="p-4 flex justify-center">
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            unsafeMetadata={{ role: activeRole }}
          />
        </div>

        <div className="text-center pb-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
