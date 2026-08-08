//essentially takes the user's question and the government-scheme information, and turn them into one big piece of final prompt (text) thats to be sent to Gemini.

import { SystemPrompt } from "./SystemPrompt";

type SchemeContext = {
  name: string;
  category: string;
  states_applicable: string[];
  eligibility_summary: string;
  required_documents: string[];
  application_steps: string[];
  estimated_timeline: string;
};

type BuildPromptInput = {
  userMessage: string;
  schemes: SchemeContext[];
};

export function buildPrompt({
  userMessage,
  schemes,
}: BuildPromptInput): string {
  const schemeContext = schemes
    .map(
      (scheme) => `
Scheme: ${scheme.name}
Category: ${scheme.category}
Applicable States: ${scheme.states_applicable.join(", ")}

Eligibility:
${scheme.eligibility_summary}

Required Documents:
${scheme.required_documents.join(", ")}

Application Steps:
${scheme.application_steps.join("\n")}

Estimated Timeline:
${scheme.estimated_timeline}
`,
    )
    .join("\n---\n");

  return `
${SystemPrompt}

AVAILABLE GOVERNMENT SCHEME INFORMATION:

${schemeContext || "No relevant scheme information was found."}

USER QUESTION:

${userMessage}
`;
}