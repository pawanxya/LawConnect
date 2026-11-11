const getDashboardPath = (role) => {
  if (role === "lawyer") {
    return "/lawyer/dashboard";
  }

  if (role === "admin") {
    return "/admin/control-center";
  }

  return "/client/dashboard";
};

export { getDashboardPath };
