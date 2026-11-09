const getDashboardPath = (role) => {
  if (role === "lawyer") {
    return "/lawyer/dashboard";
  }

  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/client/dashboard";
};

export { getDashboardPath };
