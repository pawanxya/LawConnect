import "./env.js";
import mongoose from "mongoose";
import { app } from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { ensureSeedData } from "./src/seed/seedData.js";
import { initializeSocket } from "./src/socket.js";

const port = Number(process.env.PORT || 4000);

const assertRequiredEnv = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
};

const startHttpServer = () =>
  new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once("listening", () => {
      console.log(`Backend running on http://localhost:${port}`);
      resolve(server);
    });

    server.once("error", reject);
  });

const startServer = async () => {
  assertRequiredEnv();

  await connectDB();
  await ensureSeedData();

  const server = await startHttpServer();

  initializeSocket(server);

  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await mongoose.connection.close();
        process.exit(0);
      } catch (error) {
        console.error("Failed to close MongoDB connection", error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((error) => {
  if (mongoose.connection.readyState !== 0) {
    mongoose.connection.close().catch(() => {});
  }

  if (error?.code === "EADDRINUSE") {
    console.error(`Failed to start backend: port ${port} is already in use.`);
    process.exit(1);
  }

  console.error("Failed to start backend", error);
  process.exit(1);
});
