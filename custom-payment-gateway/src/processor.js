import crypto from "node:crypto";

/**
 * 2D Card Processing Engine
 * In 2D payment gateways (unlike 3DS), the transaction is directly authorized
 * via acquirer network (AVS + CVV2) without customer SMS OTP redirect.
 */

// Validate credit card number using standard Luhn Algorithm
export function validateLuhn(cardNumber) {
  const digits = String(cardNumber).replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// Detect card brand/scheme
export function detectCardBrand(cardNumber) {
  const cleaned = String(cardNumber).replace(/\D/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "American Express";
  if (/^(60|65|81|82)/.test(cleaned)) return "RuPay";
  if (/^6011|65|64[4-9]|622/.test(cleaned)) return "Discover";
  return "Unknown";
}

// Mask card number for PCI compliance
export function maskCardNumber(cardNumber) {
  const cleaned = String(cardNumber).replace(/\D/g, "");
  if (cleaned.length < 10) return "************";
  const first6 = cleaned.substring(0, 6);
  const last4 = cleaned.substring(cleaned.length - 4);
  return `${first6}${"*".repeat(cleaned.length - 10)}${last4}`;
}

// Process 2D Card Transaction
export async function process2DCardPayment({
  cardNumber,
  cardExpiry, // MM/YY or MM/YYYY
  cardCvv,
  cardHolderName,
  amount,
  currency = "INR",
  orderId,
  customerDetails = {}
}) {
  const cleanCard = String(cardNumber).replace(/\D/g, "");
  const cleanCvv = String(cardCvv).trim();
  const cardBrand = detectCardBrand(cleanCard);

  // 1. Basic format validations
  if (!cleanCard || cleanCard.length < 13) {
    return {
      status: "DECLINED",
      responseCode: "14",
      message: "Invalid Card Number length.",
      declineReason: "INVALID_CARD_NUMBER"
    };
  }

  // 2. Validate CVV (3-4 digits)
  if (!cleanCvv || cleanCvv.length < 3 || cleanCvv.length > 4) {
    return {
      status: "DECLINED",
      responseCode: "82",
      message: "Invalid Security Code (CVV).",
      declineReason: "INVALID_CVV"
    };
  }

  // 3. Expiry date check
  if (cardExpiry) {
    const parts = cardExpiry.split("/");
    if (parts.length === 2) {
      const expMonth = parseInt(parts[0], 10);
      let expYear = parseInt(parts[1], 10);
      if (expYear < 100) expYear += 2000;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        return {
          status: "DECLINED",
          responseCode: "54",
          message: "Card has expired.",
          declineReason: "EXPIRED_CARD"
        };
      }
    }
  }

  // 4. Test Card Rule Evaluation
  // Simulation for different testing scenarios
  if (cleanCard.endsWith("0002")) {
    return {
      status: "DECLINED",
      responseCode: "51",
      message: "Insufficient Funds in Account.",
      declineReason: "INSUFFICIENT_FUNDS"
    };
  }

  if (cleanCard.endsWith("0003")) {
    return {
      status: "DECLINED",
      responseCode: "54",
      message: "Card has expired or inactive.",
      declineReason: "EXPIRED_CARD"
    };
  }

  if (cleanCard.endsWith("0004")) {
    return {
      status: "DECLINED",
      responseCode: "59",
      message: "Suspected Fraud / High Risk Block.",
      declineReason: "FRAUD_SUSPECTED"
    };
  }

  // Check Luhn algorithm
  const isLuhnValid = validateLuhn(cleanCard);
  if (!isLuhnValid) {
    return {
      status: "DECLINED",
      responseCode: "14",
      message: "Card number failed Luhn checksum validation.",
      declineReason: "INVALID_CARD_NUMBER"
    };
  }

  // 5. Successful 2D Direct Authorization
  const authCode = "AUTH" + Math.floor(100000 + Math.random() * 900000);
  const rrn = "RRN" + Math.floor(100000000000 + Math.random() * 900000000000);
  const arn = "ARN" + Date.now() + Math.floor(1000 + Math.random() * 9000);

  return {
    status: "APPROVED",
    responseCode: "00",
    message: "Transaction Authorized Successfully (2D Direct Post)",
    authCode,
    rrn,
    arn,
    cardBrand,
    cardMasked: maskCardNumber(cleanCard),
    cardHolderName: cardHolderName || customerDetails.name || "Cardholder",
    flow: "2D_DIRECT_AUTHORIZATION",
    avsResult: "Y (Address & ZIP matched)",
    cvvResult: "M (CVV match)",
    threeDsBypassed: true
  };
}

// Process UPI Instant Payment simulation
export async function processUpiPayment({ vpa, amount, currency = "INR", orderId, customerDetails }) {
  const cleanVpa = String(vpa || "").trim().toLowerCase();
  if (!cleanVpa.includes("@")) {
    return {
      status: "DECLINED",
      responseCode: "U1",
      message: "Invalid UPI ID / VPA format. Must contain '@'.",
      declineReason: "INVALID_VPA"
    };
  }

  const utr = "UPI" + Date.now().toString().slice(-10) + Math.floor(10 + Math.random() * 90);

  return {
    status: "APPROVED",
    responseCode: "00",
    message: "UPI Collect Approved Instantaneously",
    utr,
    vpa: cleanVpa,
    flow: "UPI_DIRECT_SETTLEMENT",
    threeDsBypassed: true
  };
}

// Process NetBanking simulation
export async function processNetBankingPayment({ bankCode, amount, currency = "INR", orderId }) {
  const bankNames = {
    HDFC: "HDFC Bank",
    ICICI: "ICICI Bank",
    SBI: "State Bank of India",
    AXIS: "Axis Bank",
    KOTAK: "Kotak Mahindra Bank"
  };

  const bankName = bankNames[bankCode] || "Partner Bank";
  const refNo = "NB" + Math.floor(100000000 + Math.random() * 900000000);

  return {
    status: "APPROVED",
    responseCode: "00",
    message: `${bankName} Direct Debit Successful`,
    bankRefNo: refNo,
    bankCode,
    flow: "NETBANKING_DIRECT",
    threeDsBypassed: true
  };
}
