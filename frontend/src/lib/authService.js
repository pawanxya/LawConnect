import { apiRequest, setAuthToken } from "@/lib/apiClient";

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    id: user.id || user._id,
  };
};

const getSessionUser = async () => {
  try {
    const response = await apiRequest("/auth/me", { auth: true });
    return normalizeUser(response.user);
  } catch {
    return null;
  }
};

const syncClerkUser = async (payload) => {
  try {
    const response = await apiRequest("/auth/sync", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    });
    return normalizeUser(response.user);
  } catch (error) {
    console.error("Failed to sync Clerk user with backend:", error);
    return null;
  }
};

const registerUser = async (payload) => {
  const response = await apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAuthToken(response.token);
  return normalizeUser(response.user);
};

const loginUser = async ({ email, password, role }) => {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
  setAuthToken(response.token);
  return normalizeUser(response.user);
};

const logoutUser = async () => {
  try {
    if (typeof window !== "undefined" && window.Clerk) {
      await window.Clerk.signOut();
    }
    await apiRequest("/auth/logout", { method: "POST", auth: true });
  } catch {
    // Ignore logout API failures and clear local token anyway.
  } finally {
    setAuthToken(null);
  }
};

const updateUser = async (updates) => {
  const response = await apiRequest("/auth/me", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(updates),
  });
  return normalizeUser(response.user);
};

const listDemoCredentials = async () => {
  try {
    const response = await apiRequest("/auth/demo-credentials");
    return response.credentials || [];
  } catch {
    return [
      { role: "client", email: "client@example.com", password: "client123" },
      { role: "lawyer", email: "lawyer@example.com", password: "lawyer123" },
      { role: "admin", email: "admin@lawconnect.com", password: "admin123" },
    ];
  }
};

export {
  getSessionUser,
  registerUser,
  loginUser,
  logoutUser,
  updateUser,
  listDemoCredentials,
  syncClerkUser,
};
