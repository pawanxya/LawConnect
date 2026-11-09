import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";

import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("⚠️ Missing VITE_CLERK_PUBLISHABLE_KEY in .env file. Please add your Clerk publishable key.");
}

createRoot(document.getElementById("root")).render(
  PUBLISHABLE_KEY ? (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  ) : (
    <App />
  )
);
