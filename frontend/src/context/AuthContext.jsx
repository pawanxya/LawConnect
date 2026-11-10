import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import {
  getSessionUser,
  loginUser,
  logoutUser,
  syncClerkUser,
  updateUser,
} from "@/lib/authService";
import { disconnectSocket } from "@/lib/socketClient";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Hook into Clerk user state safely
  let clerkUser = null;
  let isClerkLoaded = true;
  let clerk = null;

  try {
    const userHook = useUser();
    clerkUser = userHook.user;
    isClerkLoaded = userHook.isLoaded;
    clerk = useClerk();
  } catch {
    // ClerkProvider might not be mounted yet if key is absent
    isClerkLoaded = true;
  }

  // Sync Clerk user with MongoDB backend
  useEffect(() => {
    let isMounted = true;

    const handleClerkSync = async () => {
      if (!isClerkLoaded) return;

      if (clerkUser) {
        setIsAuthLoading(true);
        try {
          const synced = await syncClerkUser({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName || clerkUser.firstName || "User",
            avatar: clerkUser.imageUrl,
            role: clerkUser.unsafeMetadata?.role || clerkUser.publicMetadata?.role || "client",
          });

          if (isMounted && synced) {
            setCurrentUser(synced);
          }
        } catch (err) {
          console.error("Clerk sync error:", err);
        } finally {
          if (isMounted) setIsAuthLoading(false);
        }
      } else {
        // If no Clerk user, check for session user
        const sessionUser = await getSessionUser();
        if (isMounted) {
          setCurrentUser(sessionUser);
          setIsAuthLoading(false);
        }
      }
    };

    handleClerkSync();

    return () => {
      isMounted = false;
    };
  }, [clerkUser, isClerkLoaded]);

  const signin = useCallback(async (payload) => {
    const user = await loginUser(payload);
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (clerk) {
        await clerk.signOut();
      }
    } catch {
      // Ignore clerk signout errors
    }
    await logoutUser();
    disconnectSocket();
    setCurrentUser(null);
  }, [clerk]);

  const saveProfile = useCallback(
    async (updates) => {
      if (!currentUser) throw new Error("No logged in user.");
      const updated = await updateUser(updates);
      setCurrentUser(updated);
      return updated;
    },
    [currentUser],
  );

  const updateCredentials = useCallback(
    async (creds) => {
      if (!currentUser) throw new Error("No logged in user.");
      const updated = await updateUser(creds);
      setCurrentUser(updated);
      return updated;
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      isAuthenticated: Boolean(currentUser) && !isAuthLoading,
      isAuthLoading,
      signin,
      saveProfile,
      updateCredentials,
      logout,
    }),
    [currentUser, isAuthLoading, logout, saveProfile, signin, updateCredentials],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthProvider, useAuth };
