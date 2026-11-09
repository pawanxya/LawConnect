import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Intelligent fallback responder when GEMINI_API_KEY is unavailable or experiencing rate limits.
 */
const getHeuristicLegalReply = (lastUserMsg = "") => {
  const query = lastUserMsg.toLowerCase();

  if (query.includes("cheque") || query.includes("check") || query.includes("bounce") || query.includes("138")) {
    return (
      "Under **Section 138 of the Negotiable Instruments Act**, cheque bounce is a criminal offence in India.\n\n" +
      "📌 **Immediate Steps:**\n" +
      "1. Send a formal **Statutory Demand Legal Notice** within 30 days of receiving the cheque bounce memo.\n" +
      "2. Provide 15 days for the issuer to clear the funds.\n" +
      "3. If unpaid after 15 days, file a criminal complaint before the Magistrate within 30 days.\n\n" +
      "💡 *Recommended Advocate:* Please consult a **Banking & Financial Dispute Lawyer** under 'Find Lawyers'."
    );
  }

  if (query.includes("bail") || query.includes("arrest") || query.includes("fir") || query.includes("police")) {
    return (
      "In criminal matters involving FIR or arrest risk:\n\n" +
      "📌 **Legal Protections:**\n" +
      "1. **Anticipatory Bail:** Apply before the Sessions Court or High Court if there is apprehension of arrest.\n" +
      "2. **Regular Bail:** Apply under Section 437/439 CrPC / BNSS if in custody.\n" +
      "3. You have the fundamental right to know the grounds of arrest and consult an advocate immediately.\n\n" +
      "💡 *Recommended Advocate:* Connect with a verified **Criminal Defense Lawyer** on LawConnect."
    );
  }

  if (query.includes("divorce") || query.includes("maintenance") || query.includes("custody") || query.includes("marriage")) {
    return (
      "For matrimonial and family disputes under Indian Law:\n\n" +
      "📌 **Options Available:**\n" +
      "1. **Mutual Consent Divorce:** Section 13B Hindu Marriage Act / Special Marriage Act (fastest resolution).\n" +
      "2. **Contested Divorce:** Grounds of cruelty, desertion, or adultery.\n" +
      "3. **Maintenance & Child Custody:** Claimable under Section 125 CrPC / Section 24 HMA.\n\n" +
      "💡 *Recommended Advocate:* Connect with a verified **Family & Matrimonial Lawyer** for confidential counsel."
    );
  }

  if (query.includes("rent") || query.includes("landlord") || query.includes("tenant") || query.includes("deposit") || query.includes("property")) {
    return (
      "For tenancy and security deposit disputes:\n\n" +
      "📌 **Legal Remedies:**\n" +
      "1. **Security Deposit Recovery:** Unlawful withholding of deposit can be challenged via Legal Notice.\n" +
      "2. **Illegal Eviction:** Landlords cannot forcefully disconnect utilities or lock premises without a court order.\n" +
      "3. Escalation can be made to the Rent Authority under the Model Tenancy Act.\n\n" +
      "💡 *Recommended Advocate:* Search for a **Property & Tenancy Lawyer** to issue an advocate notice."
    );
  }

  return (
    "Hello! I am your LawConnect AI Legal Assistant.\n\n" +
    "You can describe your legal query (e.g. cheque bounce, property issue, tenancy deposit, divorce, contract breach), and I will break down the applicable Indian laws, immediate steps, and the right advocate category.\n\n" +
    "You can also click **'AI Case Brief'** below to generate a comprehensive legal breakdown of your dispute!"
  );
};

export const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message && (!history || history.length === 0)) {
      return res.status(400).json({ error: "Message or history is required." });
    }

    // Extract last user message
    let lastUserMessage = message || "";
    if (!lastUserMessage && Array.isArray(history)) {
      const userEntries = history.filter((h) => h.role === "user");
      if (userEntries.length > 0) {
        lastUserMessage = userEntries[userEntries.length - 1].content;
      }
    }

    // 1. If GEMINI_API_KEY is configured, run through Google Generative AI
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Uses the ultra-fast, high-availability gemini-flash-lite-latest model
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

        const systemInstruction = `You are an expert Indian Legal Assistant for LawConnect.
Answer questions directly, accurately, and politely in English or Hindi (depending on user input).
Structure your answers with bullet points:
- Key Legal Principle / Applicable Indian Law
- 2-3 Actionable Steps
- Recommended Lawyer Specialization on LawConnect
Keep responses concise, clear, and easy for laypeople to understand. Do not add generic disclaimer boilerplate.`;

        let prompt = `${systemInstruction}\n\n`;

        if (history && Array.isArray(history)) {
          prompt += history
            .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
            .join("\n");
          prompt += `\nAssistant:`;
        } else {
          prompt += `User: ${lastUserMessage}\nAssistant:`;
        }

        const result = await model.generateContent(prompt);
        const text = (await result.response).text();

        return res.status(200).json({ reply: text });
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to heuristic legal responder:", geminiError.message);
      }
    }

    // 2. Fallback to intelligent legal knowledge base
    const reply = getHeuristicLegalReply(lastUserMessage);
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return res.status(500).json({ error: "Failed to process AI response." });
  }
};

/**
 * AI Legal Case Summarizer
 * Analyzes case narratives, extracts core disputes, suggests relevant Indian laws,
 * tactical next steps, and required documentation checklist.
 */
export const summarizeCase = async (req, res) => {
  try {
    const { caseDescription, category } = req.body;
    if (!caseDescription || !String(caseDescription).trim()) {
      return res.status(400).json({ error: "Case description is required for legal analysis." });
    }

    // 1. If GEMINI_API_KEY is configured, run through Google Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

        const prompt = `You are a Senior Legal Counsel in India. Analyze the following client case and provide a structured JSON response:
Case Details: "${caseDescription}"
Category: "${category || "General"}"

Respond ONLY with a valid JSON object strictly matching this schema, without markdown formatting or code blocks:
{
  "summary": "Concise 2-3 sentence executive legal summary of the dispute",
  "recommendedCategory": "Specific lawyer specialization required (e.g., Property & Real Estate, Criminal Defense, Corporate & Contract, Family / Matrimonial)",
  "applicableLaws": ["List of 2-4 applicable Indian Acts or Sections (e.g. Section 138 NI Act, Specific Relief Act, Section 420 IPC)"],
  "recommendedSteps": ["3 immediate tactical steps the client must take"],
  "requiredDocuments": ["3-5 crucial documents to prepare (e.g., Agreement, Written Notice, Bank Statement)"]
}`;

        const result = await model.generateContent(prompt);
        const text = (await result.response).text();
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return res.status(200).json(parsed);
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to heuristic legal analyzer:", geminiError.message);
      }
    }

    // 2. Heuristic Fallback Analysis
    const lower = caseDescription.toLowerCase();
    let detectedCategory = "Civil & General Dispute";
    let laws = ["Indian Contract Act, 1872", "Code of Civil Procedure (CPC), 1908"];

    if (
      lower.includes("rent") ||
      lower.includes("landlord") ||
      lower.includes("tenant") ||
      lower.includes("deposit") ||
      lower.includes("flat") ||
      lower.includes("property") ||
      lower.includes("possession")
    ) {
      detectedCategory = "Property & Tenancy Law";
      laws = ["Transfer of Property Act, 1882", "Model Tenancy Act / State Rent Control Act"];
    } else if (
      lower.includes("cheque") ||
      lower.includes("money") ||
      lower.includes("loan") ||
      lower.includes("debt") ||
      lower.includes("fraud") ||
      lower.includes("bounce")
    ) {
      detectedCategory = "Banking & Financial Dispute";
      laws = ["Section 138 Negotiable Instruments Act", "Section 420 Indian Penal Code (Cheating & Dishonesty)"];
    } else if (
      lower.includes("divorce") ||
      lower.includes("marriage") ||
      lower.includes("custody") ||
      lower.includes("maintenance") ||
      lower.includes("dowry")
    ) {
      detectedCategory = "Family & Matrimonial Law";
      laws = ["Hindu Marriage Act / Special Marriage Act", "Family Courts Act, 1984"];
    } else if (
      lower.includes("police") ||
      lower.includes("fir") ||
      lower.includes("bail") ||
      lower.includes("arrest") ||
      lower.includes("threat")
    ) {
      detectedCategory = "Criminal Defense";
      laws = ["Bharatiya Nyaya Sanhita (BNS) / IPC", "Bharatiya Nagarik Suraksha Sanhita (BNSS) / CrPC"];
    }

    return res.status(200).json({
      summary: `Dispute regarding ${detectedCategory.toLowerCase()}: The client seeks remedy regarding contractual obligations, violation of rights, and resolution of financial or legal interests.`,
      recommendedCategory: detectedCategory,
      applicableLaws: laws,
      recommendedSteps: [
        "Consolidate all chronological communications, agreements, and payment records.",
        "Draft and serve a formal Legal Notice through a registered advocate.",
        "Initiate mediation or file appropriate petition before the competent court / tribunal."
      ],
      requiredDocuments: [
        "Primary Agreement / Contract copy",
        "Bank transaction receipts or invoices",
        "Written correspondence (Emails, WhatsApp, Letters)",
        "Identity and address proofs"
      ]
    });
  } catch (error) {
    console.error("Case summarizer error:", error);
    return res.status(500).json({ error: "Failed to generate legal case summary." });
  }
};
