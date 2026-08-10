export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove markdown headings (# ## ### etc) but keeps the heading text
  cleaned = cleaned.replace(/^#+\s+(.*)$/gm, '$1');

  // 2. Remove **bold** markers but keeps text
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.*?)__/g, '$1');

  // 3. Remove *italic* markers but keeps text
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  cleaned = cleaned.replace(/_(.*?)_/g, '$1');

  // 4. Remove bullet symbols (-, *, •) at start of lines but keeps text
  cleaned = cleaned.replace(/^[\-\*\•]\s+(.*)$/gm, '$1');

  // 5. Remove markdown links [text](url) - keeps just the text
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // 6. Remove code blocks (``` ... ```) - removes the fencing
  cleaned = cleaned.replace(/```[a-z]*\n([\s\S]*?)```/g, '$1');

  // 7. Remove inline code backticks
  cleaned = cleaned.replace(/`(.*?)`/g, '$1');

  // 8. Converts numbered lists to natural flow
  cleaned = cleaned.replace(/^\d+\.\s+(.*)$/gm, '$1');

  // 9. Remove JSON formatting (heuristic)
  cleaned = cleaned.replace(/[\{\}\[\]\"]/g, '');

  // 10. Remove UI-only labels
  cleaned = cleaned.replace(/\b(Listen|Click here|Read more)\b/gi, '');

  // 11. Collapses multiple newlines to single periods/pauses
  cleaned = cleaned.replace(/\n\s*\n/g, '. ');
  cleaned = cleaned.replace(/\n/g, ' ');

  // Clean up extra spaces and dots
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/\.{2,}/g, '.');

  // 12. Trims excessive whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

export function buildSpeechText(
  content: string, 
  structured?: { 
    eligibility?: string; 
    documents?: string[]; 
    steps?: string[]; 
    timeline?: string 
  }
): string {
  let speechText = cleanTextForSpeech(content);

  if (structured) {
    if (structured.eligibility) {
      speechText += `. Eligibility: ${cleanTextForSpeech(structured.eligibility)}`;
    }
    
    if (structured.documents && structured.documents.length > 0) {
      const docs = structured.documents.map(d => cleanTextForSpeech(d));
      if (docs.length === 1) {
        speechText += `. Required documents include ${docs[0]}.`;
      } else if (docs.length === 2) {
        speechText += `. Required documents include ${docs[0]} and ${docs[1]}.`;
      } else {
        const last = docs.pop();
        speechText += `. Required documents include ${docs.join(', ')}, and ${last}.`;
      }
    }
    
    if (structured.steps && structured.steps.length > 0) {
      const steps = structured.steps.map(s => cleanTextForSpeech(s));
      speechText += `. The application steps are: `;
      const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
      steps.forEach((step, index) => {
        const prefix = index < ordinals.length ? ordinals[index] : `Step ${index + 1}`;
        speechText += `${prefix}, ${step}. `;
      });
    }
    
    if (structured.timeline) {
      speechText += `The expected timeline is ${cleanTextForSpeech(structured.timeline)}.`;
    }
  }

  return speechText.replace(/\.{2,}/g, '.').replace(/\s{2,}/g, ' ').trim();
}
