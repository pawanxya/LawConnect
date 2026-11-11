const localOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const allowedOrigins = () => {
  const configured = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured.length ? configured : localOrigins;
};

export const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (health checks, server-to-server calls) are valid.
    // Vite may use localhost, IPv6, or a LAN address while developing. Local
    // development does not need production's strict browser-origin allowlist.
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    if (
      !origin ||
      allowedOrigins().includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
};
