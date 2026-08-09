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
};

export function buildPrompt({
  userMessage,
  schemes,
  conversationHistory,
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

  return `
${SystemPrompt}

CONVERSATION HISTORY:

${conversationContext || "No previous conversation."}

AVAILABLE GOVERNMENT SCHEME INFORMATION:

${schemeContext || "No relevant scheme information was found."}

CURRENT USER QUESTION:

${userMessage}
`;
}