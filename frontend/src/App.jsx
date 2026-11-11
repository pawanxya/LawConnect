import { Suspense, lazy } from "react";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLoader from "@/components/AppLoader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/RouteGuards";
import { AuthProvider } from "@/context/AuthContext";
import { AIAssistant } from "@/components/AIAssistant";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Signup = lazy(() => import("./pages/Signup"));
const Lawyers = lazy(() => import("./pages/Lawyers"));
const LawyerProfile = lazy(() => import("./pages/LawyerProfile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const LawyerDashboard = lazy(() => import("./pages/LawyerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Messages = lazy(() => import("./pages/Messages"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Bookings = lazy(() => import("./pages/Bookings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="lawconnect-theme">
          <TooltipProvider>
            <Sonner position="bottom-right" richColors />
            <AIAssistant />

            <BrowserRouter>
              <Suspense fallback={<AppLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route
                    path="/login/*"
                    element={
                      <PublicOnlyRoute>
                        <Login />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/admin/login"
                    element={
                      <PublicOnlyRoute>
                        <AdminLogin />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/signup/*"
                    element={
                      <PublicOnlyRoute>
                        <Signup />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/lawyer/signup/*"
                    element={
                      <PublicOnlyRoute>
                        <Signup initialTab="lawyer" />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route path="/lawyers" element={<Lawyers />} />
                  <Route path="/lawyer/:id" element={<LawyerProfile />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route
                    path="/client/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["client"]}>
                        <ClientDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/lawyer/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["lawyer"]}>
                        <LawyerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <Navigate to="/admin/control-center" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/control-center"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin" element={<Navigate to="/admin/control-center" replace />} />
                  <Route
                    path="/messages"
                    element={
                      <ProtectedRoute allowedRoles={["client", "lawyer"]}>
                        <Messages />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <ProtectedRoute allowedRoles={["client", "lawyer"]}>
                        <Bookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
