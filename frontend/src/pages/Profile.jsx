import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";
import { ArrowLeft, Camera } from "lucide-react";
import { toast } from "sonner";

const buildAvatar = (user) => {
  if (user?.avatar) {
    return user.avatar;
  }

  const name = user?.name || "User";
  const n = name.trim().toLowerCase();
  const isFemale =
    n.endsWith("a") ||
    n.endsWith("i") ||
    n.endsWith("ee") ||
    n.endsWith("ya") ||
    n.endsWith("shree") ||
    n.endsWith("ti") ||
    n.endsWith("ri") ||
    n.endsWith("na") ||
    n.endsWith("ma") ||
    n.endsWith("ra") ||
    n.endsWith("ta");
  const maleExceptions = ["raja", "rama", "krishna", "musa", "ravi", "rishi", "shakti", "baba", "data", "pasha", "surya", "arya"];
  
  let gender = "men";
  if (isFemale && !maleExceptions.some(ex => n === ex || n.endsWith(" " + ex))) {
    gender = "women";
  }

  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = (hash << 5) - hash + n.charCodeAt(i);
    hash |= 0;
  }
  const id = Math.abs(hash) % 99;
  return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
};

const getInitials = (name) => {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
};

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, saveProfile, updateCredentials } = useAuth();
  const hasSession = Boolean(currentUser);
  const avatarInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    location: currentUser?.location || "",
  });
  const [credentialsData, setCredentialsData] = useState({
    email: currentUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setFormData({
      name: currentUser?.name || "",
      phone: currentUser?.phone || "",
      location: currentUser?.location || "",
    });
    setCredentialsData((prev) => ({
      ...prev,
      email: currentUser?.email || "",
    }));
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveProfile(formData);
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(error.message || "Unable to update profile.");
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();

    if (
      credentialsData.newPassword &&
      credentialsData.newPassword !== credentialsData.confirmPassword
    ) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    if (credentialsData.newPassword && credentialsData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    try {
      await updateCredentials({
        email: credentialsData.email,
        currentPassword: credentialsData.currentPassword,
        newPassword: credentialsData.newPassword,
      });
      setCredentialsData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      toast.success("Credentials updated. Use new details on next login.");
    } catch (error) {
      toast.error(error.message || "Unable to update credentials.");
    }
  };

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await saveProfile({ avatar: reader.result });
        toast.success("Profile photo updated.");
      } catch (error) {
        toast.error(error.message || "Unable to update profile photo.");
      }
    };
    reader.onerror = () => toast.error("Unable to read selected file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div id="main-content" className="flex-1 container mx-auto px-4 py-8">
        {!hasSession ? (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Unable to load profile session. Please login again.
              </p>
              <Button onClick={() => navigate("/login")}>Go to Login</Button>
            </CardContent>
          </Card>
        ) : (
          <>
        <Button
          variant="ghost"
          onClick={() => navigate(getDashboardPath(currentUser.role))}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={buildAvatar(currentUser)} />
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    type="button"
                    aria-label="Upload profile photo"
                    onClick={handleAvatarPick}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={credentialsData.email}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: e.target.value,
                      })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Account Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="credential-email">Login Email</Label>
                  <Input
                    id="credential-email"
                    type="email"
                    value={credentialsData.email}
                    onChange={(e) =>
                      setCredentialsData({
                        ...credentialsData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={credentialsData.currentPassword}
                    onChange={(e) =>
                      setCredentialsData({
                        ...credentialsData,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={credentialsData.newPassword}
                    onChange={(e) =>
                      setCredentialsData({
                        ...credentialsData,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={credentialsData.confirmPassword}
                    onChange={(e) =>
                      setCredentialsData({
                        ...credentialsData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  Update Credentials
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};
export default Profile;
