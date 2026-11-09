import { apiRequest } from "./apiClient";

export const createRazorpayOrder = async (payload) => {
  return await apiRequest("/payments/create-order", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
};

export const verifyRazorpayPayment = async (payload) => {
  return await apiRequest("/payments/verify-payment", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
};

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
