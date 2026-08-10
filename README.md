# ManuhSathi AI

A multilingual, AI-powered public-service assistant that helps citizens understand government schemes, check eligibility, learn required documents, and follow application steps — with a focus on Assam and Northeast India.

> **manuh** (মানুহ) — *person* in Assamese &nbsp;|&nbsp; **sathi** (সাথী) — *companion*

---

## Features

- **Conversational scheme guidance** — Ask questions in natural language and receive structured, source-grounded answers about government schemes and public services.
- **Structured responses** — Every scheme-related answer is broken down into eligibility, required documents, application steps, and estimated timelines.
- **Anti-hallucination guardrails** — The system prompt strictly prohibits the LLM from inventing eligibility, documents, fees, or procedures. When information is unavailable, it says so. Information is sourced from a demo database of schemes; can be accessed from data\schemes.seed.json.
- **Session-based conversation memory** — Each conversation is persisted in Supabase, giving the model full context of prior exchanges within a session.
- **Multilingual support** — Interface and voice input available in English, Assamese (অসমীয়া), and Bodo (बड़ो) via Sarvam AI speech-to-text.
- **Voice input** — Record audio directly in the browser; speech is transcribed server-side using Sarvam AI's `saaras:v3` model.
- **Curated knowledge base** — 9 verified government schemes seeded from a structured JSON dataset, covering certificates, pensions, scholarships, and financial assistance.
- **Responsive, mobile-first UI** — Dark-themed interface with safe-area support, auto-resizing input, smooth animations, and starter prompts for first-time users.

---

## Why ManuhSathi AI?

1. We target the service towards the remotest regions of the area of interest. Often it is expected and normal to assume that the people thriving in the remotest places may not have access to adequate knowledge about the schemes provided by the governement, that would benefit them, esentially "robbing" the schemes from access to people who maybe genuinely need the schemes assistance. WE assume this scenario at a realistic sense considering a lot of the remote regions of the area dont provide its communities within, with access to electricity, internet connections, or fancy services.
2. Government scheme information in India — especially at the state level — is fragmented across portals, PDFs, and offices. Even when the information exists, understanding eligibility criteria, gathering the right documents, and knowing the correct steps is difficult for ordinary citizens.

ManuhSathi AI turns that scattered information into a simple accessible conversation:

```
You:        "Am I eligible for the post-matric SC scholarship?"
ManuhSathi: Explains eligibility conditions, lists documents,
            outlines application steps on NSP, and notes the timeline.
```

Instead of just answering questions, ManuhSathi AI asks clarifying follow-ups when information is missing and provides structured, actionable guidance — behaving more like a knowledgeable assistant than a search engine.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework with API routes |
| **Language** | TypeScript | Type-safe development |
| **AI Model** | Google Gemini 3.6 Flash | Natural-language understanding and structured response generation |
| **AI SDK** | `@google/genai` | Official Google Gen AI client |
| **Database** | Supabase (PostgreSQL) | Session persistence, message history, scheme knowledge base |
| **Speech-to-Text** | Sarvam AI (`saaras:v3`) | Multilingual STT for English, Assamese, and Bodo |
| **Styling** | Tailwind CSS 4 + custom CSS variables | Dark theme with custom design tokens and animations |
| **Font** | Inter (Google Fonts) | Clean, modern typography |
| **Package Manager** | pnpm | Fast, disk-efficient dependency management |

---

## Current Coverage

The knowledge base currently contains **9 curated government schemes and services**:

### Assam

| Scheme | Category |
|---|---|
| Income Certificate (Sewa Setu / ARTPS) | Certificate |
| Permanent Residence Certificate (PRC) | Certificate |
| Caste Certificate (SC / ST / OBC / MOBC) | Certificate |
| Birth Certificate (Sewa Setu) | Certificate |
| Old Age Pension (IGNOAPS) | Social Welfare / Pension |
| Widow Pension (IGNWPS) | Social Welfare / Pension |
| Indira Miri Universal Widow Pension | Social Welfare / Pension |
| Post-Matric Scholarship for SC Students | Education / Financial Assistance |

### All India

| Scheme | Category |
|---|---|
| PM-KISAN (Pradhan Mantri Kisan Samman Nidhi) | Financial Assistance / Agriculture |

Each scheme entry includes eligibility criteria, required documents, step-by-step application instructions, and estimated processing timelines — all verified against official sources.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (`corepack enable` to use the bundled pnpm)
- A **Supabase** project with the required tables (see [Database Setup](#database-setup))
- A **Google AI Studio** API key (Gemini)
- A **Sarvam AI** API key (for speech-to-text)

### Installation

```bash
git clone https://github.com/<your-username>/manuhsathi-ai.git
cd manuhsathi-ai
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SARVAM_API_KEY=your_sarvam_api_key
NEXT_PUBLIC_APP_ENV=development/production depending on the production progress
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key for Gemini 3.6 Flash |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server-side only, bypasses RLS) |
| `SARVAM_API_KEY` | Yes | Sarvam AI API key for multilingual speech-to-text |

### Database Setup

Create the following tables in your Supabase project:

**`sessions`**

| Column | Type | Notes |
|---|---|---|
| `session_id` | `uuid` | Primary key |
| `created_at` | `timestamptz` | Default: `now()` |

**`messages`**

| Column | Type | Notes |
|---|---|---|
| `message_id` | `uuid` | Primary key |
| `session_id` | `uuid` | Foreign key → `sessions.session_id` |
| `role` | `text` | `'user'` or `'assistant'` |
| `content` | `text` | Message body |
| `created_at` | `timestamptz` | Default: `now()` |

**`schemes`**

| Column | Type | Notes |
|---|---|---|
| `scheme_id` | `text` | Primary key (used for upsert) |
| `name` | `text` | Scheme display name |
| `category` | `text` | e.g., Certificate, Pension |
| `states_applicable` | `text` | e.g., Assam, All India |
| `eligibility_summary` | `text` | Eligibility criteria |
| `required_documents` | `text` | Documents list |
| `application_steps` | `text` | Step-by-step procedure |
| `estimated_timeline` | `text` | Processing time estimate |

#### Seed the Schemes

After creating the tables, populate the knowledge base:

```bash
pnpm seed:schemes
```

This reads [`data/schemes.seed.json`](data/schemes.seed.json) and upserts all 9 schemes into the `schemes` table.

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

---

## Project Structure

```text
manuhsathi-ai/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Chat endpoint — prompt assembly, Gemini call, response parsing
│   │   ├── session/route.ts       # Session creation endpoint
│   │   └── speech/
│   │       └── stt/route.ts       # Speech-to-text endpoint (Sarvam AI)
│   ├── globals.css                # Design tokens, theme, animations
│   ├── layout.tsx                 # Root layout with metadata and font config
│   └── page.tsx                   # Main chat interface (client component)
├── components/
│   └── chat/
│       └── MicrophoneButton.tsx   # Voice recording component
├── data/
│   └── schemes.seed.json         # Curated government scheme knowledge base
├── lib/
│   ├── db/
│   │   └── supabaseAdmin.ts      # Supabase admin client (service-role)
│   ├── llm/
│   │   └── geminiClient.ts       # Google GenAI client singleton
│   ├── prompt/
│   │   ├── SystemPrompt.ts       # System prompt with persona and guardrails
│   │   └── promptBuilder.ts      # Prompt assembly with scheme context and history
│   └── speech/
│       ├── sarvamClient.ts       # Sarvam AI SDK client
│       └── sarvamStt.ts          # STT wrapper (saaras:v3 model)
├── scripts/
│   ├── seed-schemes.ts           # Database seeding script
│   └── test-gemini.ts            # Gemini API connectivity test
├── package.json
└── tsconfig.json
```

---

## API Endpoints

### `POST /api/session`

Creates a new conversation session.

**Response:**
```json
{ "session": { "session_id": "uuid" } }
```

---

### `POST /api/chat`

Sends a user message and returns a structured AI response.

**Request Body:**
```json
{
  "message": "How do I apply for an income certificate?",
  "sessionId": "uuid",
  "language": "en-IN"
}
```

**Response:**
```json
{
  "answer": "Direct answer to the question...",
  "structured": {
    "eligibility": "Eligibility information...",
    "documents": ["Document 1", "Document 2"],
    "steps": ["Step 1", "Step 2"],
    "timeline": "Estimated processing time..."
  }
}
```

---

### `POST /api/speech/stt`

Transcribes audio to text using Sarvam AI.

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `audio` | `File` | Audio recording (WebM) |
| `language` | `string` | Language code: `en-IN`, `as-IN`, or `brx-IN` |

English and Assamese are the best supported languages under sarvam ai api, wth bodo support being the best-effort wise (according to sarvam)

**Response:**
```json
{
  "transcript": "Transcribed text...",
  "languageCode": "en-IN"
}
```

---

## Architecture

```text
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│                                                 │
│  ┌──────────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Chat UI      │  │ Language  │  │ Mic Input │ │
│  │ (page.tsx)   │  │ Selector │  │ (WebAudio)│ │
│  └──────┬───────┘  └──────────┘  └─────┬─────┘ │
└─────────┼──────────────────────────────┼────────┘
          │                              │
          ▼                              ▼
┌─────────────────┐           ┌──────────────────┐
│  POST /api/chat │           │ POST /api/speech/ │
│                 │           │      stt          │
│  1. Fetch       │           │                   │
│     history     │           │  Sarvam AI        │
│  2. Fetch       │           │  saaras:v3        │
│     schemes     │           └──────────────────┘
│  3. Build       │
│     prompt      │
│  4. Call Gemini │
│  5. Parse JSON  │
│  6. Persist     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────────┐
│Supabase│ │Gemini 3.6  │
│  (DB)  │ │   Flash    │
└────────┘ └────────────┘
```

---

## Supported Languages

| Language | Code | Voice Input | Chat |
|---|---|---|---|
| English | `en-IN` | ✅ | ✅ |
| Assamese (অসমীয়া) | `as-IN` | ✅ | ✅ |
| Bodo (बड़ो) | `brx-IN` | ✅ | ✅ |

Voice input is handled via Sarvam AI's multilingual STT. Chat responses in Assamese and Bodo are generated by Gemini based on the input language — the model is prompted to respond in the language the user writes or speaks in.

> **Note:** Assamese and Bodo are low-resource languages. Response quality in these languages depends on Gemini's training coverage and may not match English-language accuracy by 100%. The system is designed to degrade gracefully rather than produce unreliable output.

---

## Deployment

ManuhSathi AI is a standard Next.js application and can be deployed to any platform that supports it:

- **[Vercel](https://vercel.com)** — Zero-config deployment for Next.js
- **Any Node.js host** — Run `pnpm build && pnpm start`

Set all four environment variables in your hosting platform's configuration.

---


## Known Limitations

- The knowledge base is a curated MVP (9 schemes). It does not yet cover all government services. We hope to enhance and add even more schemes covered under the database, for even more usability. 
- There is no text-to-speech (TTS) output — voice is input-only.
- The chat API does not explicitly use the `language` field server-side; multilingual behavior relies on Gemini detecting the input language.
- All schemes are fetched on every chat request without filtering. This works at the current scale but would need optimization for a larger knowledge base.
- No user authentication — sessions are anonymous.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Acknowledgements

- **[Google Gemini](https://ai.google.dev/)** — AI model powering conversational responses
- **[Sarvam AI](https://www.sarvam.ai/)** — Multilingual speech-to-text for Indian languages
- **[Supabase](https://supabase.com/)** — Database and backend infrastructure
- **[Next.js](https://nextjs.org/)** — React framework
- **[Assam Sewa Setu](https://sewasetu.assam.gov.in/)** — Primary reference for Assam government service information
