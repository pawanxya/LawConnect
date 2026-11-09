import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";
import { ArrowLeft, Bell, History, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, saveProfile, updateCredentials } = useAuth();
  const storageKey = useMemo(
    () => `lawconnect:notification-preferences:${currentUser?.id || "guest"}`,
    [currentUser?.id],
  );

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
  });
  const [credentials, setCredentials] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
  });

  useEffect(() => {
    setProfile({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      location: currentUser?.location || "",
      bio: currentUser?.bio || "",
    });
  }, [currentUser]);

  useEffect(() => {
    const rawPrefs = window.localStorage.getItem(storageKey);
    if (!rawPrefs) return;

    try {
      const parsedPrefs = JSON.parse(rawPrefs);
      setNotificationPrefs({
        email: parsedPrefs.email !== false,
        push: parsedPrefs.push !== false,
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const handleSaveProfile = async () => {
    try {
      await saveProfile({
        name: profile.name,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
      });
      toast.success("Profile saved successfully.");
    } catch (error) {
      toast.error(error.message || "Unable to save profile.");
    }
  };

  const handleChangePassword = async () => {
    if (!profile.email) {
      toast.error("Email is required.");
      return;
    }

    if (credentials.newPassword && credentials.newPassword !== credentials.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    if (credentials.newPassword && credentials.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    try {
      await updateCredentials({
        email: profile.email,
        currentPassword: credentials.currentPassword,
        newPassword: credentials.newPassword,
      });
      setCredentials({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Credentials updated.");
    } catch (error) {
      toast.error(error.message || "Unable to update credentials.");
    }
  };

  const handleNotificationChange = (key, value) => {
    const nextPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(nextPrefs);
    window.localStorage.setItem(storageKey, JSON.stringify(nextPrefs));
    toast.success("Notification preferences saved.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(getDashboardPath(currentUser?.role))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-6">
          <TabsList className="flex md:flex-col h-auto w-full md:w-64 items-start justify-start gap-2 bg-transparent">
            <TabsTrigger value="profile" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10">
              <User className="h-4 w-4" /> Profile Info
            </TabsTrigger>
            <TabsTrigger value="security" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10">
              <Shield className="h-4 w-4" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="history" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10">
              <History className="h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>

          <div className="flex-1">
            <TabsContent value="profile" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Public Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} />
                  </div>
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={credentials.currentPassword}
                      onChange={(e) => setCredentials({ ...credentials, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={credentials.newPassword}
                      onChange={(e) => setCredentials({ ...credentials, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={credentials.confirmPassword}
                      onChange={(e) => setCredentials({ ...credentials, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleChangePassword}>Update Password</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <p className="font-semibold">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates about your cases via email.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={notificationPrefs.email}
                      onChange={(e) => handleNotificationChange("email", e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <p className="font-semibold">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive real-time alerts in your browser.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={notificationPrefs.push}
                      onChange={(e) => handleNotificationChange("push", e.target.checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Consultation History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your booking history, completed consultations, and request updates are available in one place.
                  </p>
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">
                      {currentUser?.role === "lawyer" ? "View client requests and completed consultations" : "View your booking history and completed consultations"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Open the history page to track approval status, cancellations, completed meetings, and review actions.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/bookings")}>Open History</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
