import { SystemPrompt } from "./SystemPrompt";

type SchemeContext = {
  name: string;
  category: string;
  states_applicable: string;
  eligibility_summary: string;
  required_documents: string;
  application_steps: string;
  estimated_timeline: string;
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type BuildPromptInput = {
  userMessage: string;
  schemes: SchemeContext[];
  conversationHistory: ConversationMessage[];
  language?: string;
};

/* ── Per-language instructions for the LLM ── */

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  "en-IN": "Respond in English.",
  "as-IN": `Respond primarily in Assamese (অসমীয়া).
Preserve official scheme names, portal names, organization names and proper nouns when appropriate.
Explain government terminology in simple Assamese.
Do not randomly switch to Hindi or English.
English may be retained for unavoidable official names, URLs, abbreviations, or technical terms.`,
  "brx-IN": `Respond primarily in Bodo (बर').
Preserve official scheme names, portal names, organization names and proper nouns when appropriate.
Explain government terminology in simple Bodo.
Do not randomly switch to Hindi or English.
English may be retained for unavoidable official names, URLs, abbreviations, or technical terms.`,
  "ne-IN": `Respond primarily in Nepali (नेपाली).
Preserve official scheme names, portal names, organization names and proper nouns when appropriate.
Explain government terminology in simple Nepali.
Do not randomly switch to Hindi or English.
English may be retained for unavoidable official names, URLs, abbreviations, or technical terms.`,
};

export function buildPrompt({
  userMessage,
  schemes,
  conversationHistory,
  language,
}: BuildPromptInput): string {
  const schemeContext = schemes
    .map(
      (scheme) => `
Scheme: ${scheme.name}
Category: ${scheme.category}
Applicable States: ${scheme.states_applicable}

Eligibility:
${scheme.eligibility_summary}

Required Documents:
${scheme.required_documents}

Application Steps:
${scheme.application_steps}

Estimated Timeline:
${scheme.estimated_timeline}
`,
    )
    .join("\n---\n");

  const conversationContext = conversationHistory
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "ManuhSathi"}: ${message.content}`,
    )
    .join("\n");

  const langInstruction =
    language && LANGUAGE_INSTRUCTIONS[language]
      ? LANGUAGE_INSTRUCTIONS[language]
      : LANGUAGE_INSTRUCTIONS["en-IN"];

  return `
${SystemPrompt}

LANGUAGE INSTRUCTION:

${langInstruction}

CONVERSATION HISTORY:

${conversationContext || "No previous conversation."}

AVAILABLE GOVERNMENT SCHEME INFORMATION:

${schemeContext || "No relevant scheme information was found."}

CURRENT USER QUESTION:

${userMessage}

RESPONSE FORMAT:

Return a valid JSON object with exactly these fields:

{
  "answer": "string",
  "eligibility": "string",
  "documents": [],
  "steps": [],
  "timeline": "string"
}

Return JSON only. Do not include markdown code fences.
`;
}