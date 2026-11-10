import { io } from "socket.io-client";
import { apiRequest } from "./apiClient";

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

export const socket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

let connectionPromise = null;

// Socket.IO never receives a user id from the browser. It receives a short-lived
// ticket issued by the authenticated API and joins the account's rooms on connect.
export const connectSocket = async () => {
  if (socket.connected) return socket;
  if (connectionPromise) return connectionPromise;

  connectionPromise = apiRequest("/socket/ticket", { method: "POST", auth: true })
    .then(({ ticket }) => new Promise((resolve, reject) => {
      socket.auth = { ticket };
      socket.once("connect", () => {
        socket.emit("join");
        resolve(socket);
      });
      socket.once("connect_error", reject);
      socket.connect();
    }))
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

export const disconnectSocket = () => {
  connectionPromise = null;
  socket.disconnect();
};
