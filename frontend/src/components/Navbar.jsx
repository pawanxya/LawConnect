import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Moon, Scale, Settings, Sun, User, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/dataService";
import { socket } from "@/lib/socketClient";

const getPrimaryNavLinks = (role) => {
  if (role === "lawyer") {
    return [
      { to: "/lawyer/dashboard", label: "Dashboard" },
      { to: "/messages", label: "Messages" },
      { to: "/bookings", label: "Requests" },
    ];
  }

  if (role === "admin") {
    return [
      { to: "/admin/dashboard", label: "Dashboard" },
    ];
  }

  if (role === "client") {
    return [
      { to: "/lawyers", label: "Find Lawyers" },
      { to: "/messages", label: "Messages" },
      { to: "/client/dashboard", label: "Dashboard" },
    ];
  }

  return [
    { to: "/lawyers", label: "Find Lawyers" },
    { to: "/messages", label: "Messages" },
  ];
};

const NotificationBell = ({
  currentUser,
  notifications,
  unreadCount,
  handleMarkAllRead,
  handleNotifClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  if (!currentUser) return null;

  return (
    <div className="relative inline-block" ref={bellRef}>
      <button
        type="button"
        className="relative p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
        ) : null}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#1e293b] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-100 text-white">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-[#0f172a]/40">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAllRead();
                }}
                className="h-auto p-0 text-xs text-blue-400 hover:text-blue-300 hover:underline bg-transparent border-0 cursor-pointer"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    handleNotifClick(notification);
                    setIsOpen(false);
                  }}
                  className={`block w-full border-b border-white/5 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                    !notification.read ? "bg-white/5 font-semibold text-blue-100" : "text-slate-300"
                  }`}
                >
                  <div className="text-sm font-medium">{notification.title}</div>
                  <div className="mt-1 text-xs opacity-80">{notification.body}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { currentUser, logout } = useAuth();
  const canGoBack = location.pathname !== "/";
  const primaryLinks = getPrimaryNavLinks(currentUser?.role);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    // Reset unread dot when on messages page
    if (location.pathname === "/messages") {
      setHasUnreadMessages(false);

      const markMessageNotificationsRead = async () => {
        try {
          const unreadMsgs = notifications.filter((n) => n.type === "new_message" && !n.read);
          if (unreadMsgs.length > 0) {
            for (const notif of unreadMsgs) {
              await markNotificationRead(notif.id);
            }
            setNotifications((prev) =>
              prev.map((n) => (n.type === "new_message" ? { ...n, read: true } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - unreadMsgs.length));
          }
        } catch (err) {
          console.error("Failed to mark message notifications read:", err);
        }
      };

      if (notifications.length > 0) {
        markMessageNotificationsRead();
      }
    }
  }, [location.pathname, notifications.length]);

  useEffect(() => {
    if (!currentUser) return;

    const loadNotifications = async () => {
      try {
        const data = await fetchNotifications();
        setNotifications(data?.notifications || []);
        setUnreadCount(data?.unreadCount || 0);
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    };

    loadNotifications();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join", currentUser.id);

    const handleNewNotification = (notification) => {
      if (notification.type === "new_message" && location.pathname === "/messages") {
        markNotificationRead(notification.id).catch(() => {});
        return;
      }
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("new_notification", handleNewNotification);

    const handleIncomingMessage = (msg) => {
      // Show dot if not on messages page
      if (location.pathname !== "/messages" && String(msg.receiverId) === String(currentUser.id)) {
        setHasUnreadMessages(true);
      }
    };

    socket.on("receive_message", handleIncomingMessage);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("receive_message", handleIncomingMessage);
    };
  }, [currentUser, location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch {
      // Ignore minor notification sync failures in navbar.
    }
  };

  const handleNotifClick = async (notification) => {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
        );
      } catch {
        // Ignore minor notification sync failures in navbar.
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 z-[60] rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            {canGoBack ? (
              <Button variant="ghost" size="icon" aria-label="Go back" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}

            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <Scale className="h-6 w-6 text-primary" />
              <span className="text-primary">LAWCONNECT</span>
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
            {primaryLinks.map((link) => (
              <Link
                key={`${link.to}-${link.label}`}
                to={link.to}
                className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
                {link.label === "Messages" && hasUnreadMessages && (
                  <span className="absolute -top-1 -right-2 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <NotificationBell
              currentUser={currentUser}
              notifications={notifications}
              unreadCount={unreadCount}
              handleMarkAllRead={handleMarkAllRead}
              handleNotifClick={handleNotifClick}
            />

            {currentUser ? (
              <>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    {currentUser?.name || "Profile"}
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="default" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <NotificationBell
              currentUser={currentUser}
              notifications={notifications}
              unreadCount={unreadCount}
              handleMarkAllRead={handleMarkAllRead}
              handleNotifClick={handleNotifClick}
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="mt-8 flex flex-col gap-3">
                  {canGoBack ? (
                    <Button variant="ghost" className="justify-start" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  ) : null}

                  {primaryLinks.map((link) => (
                    <Link key={`${link.to}-${link.label}`} to={link.to}>
                      <Button variant="ghost" className="w-full justify-start relative">
                        {link.label}
                        {link.label === "Messages" && hasUnreadMessages && (
                          <span className="ml-2 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </Button>
                    </Link>
                  ))}

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  >
                    {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </Button>

                  {currentUser ? (
                    <>
                      <Link to="/profile">
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          {currentUser?.name || "Profile"}
                        </Button>
                      </Link>
                      <Link to="/settings">
                        <Button variant="ghost" className="w-full justify-start">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                      <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login">
                        <Button variant="ghost" className="w-full">
                          Login
                        </Button>
                      </Link>
                      <Link to="/signup">
                        <Button variant="default" className="w-full">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export { Navbar };
