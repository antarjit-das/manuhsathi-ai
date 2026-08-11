"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import ListenButton from "@/components/chat/ListenButton";

type StructuredResponse = {
  eligibility: string;
  documents: string[];
  steps: string[];
  timeline: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse;
};

/* ── Language display labels ── */
const LANG_LABELS: Record<string, string> = {
  "en-IN": "EN",
  "as-IN": "অসমীয়া",
  "brx-IN": "बर'",
  "ne-IN": "नेपाली",
  "mni-IN": "Manipuri",
};

/* ── Starter prompts for empty state (per language) ── */
const STARTER_PROMPTS_BY_LANG: Record<"en-IN" | "as-IN" | "brx-IN" | "ne-IN" | "mni-IN", string[]> = {
  "en-IN": [
    "How do I apply for an income certificate?",
    "Am I eligible for a scholarship?",
    "Tell me about PM-Kisan",
    "What documents do I need for an old-age pension?",
  ],
  "as-IN": [
    "ছাত্ৰ-ছাত্ৰীসকলৰ বাবে কি কি চৰকাৰী জলপানি আঁচনি উপলব্ধ আছে?",
    "PM-KISAN আঁচনিৰ বাবে কোনসকল যোগ্য?",
    "আয়ৰ প্ৰমাণপত্ৰৰ বাবে আবেদন কৰিবলৈ মোক কি কি নথি-পত্ৰৰ প্ৰয়োজন?",
    "মই কেনেকৈ এখন চৰকাৰী আঁচনিৰ বাবে আবেদন কৰিব পাৰোঁ?",
  ],
  "brx-IN": [
    "फरायसाफोरनि थाखाय मा मा सोलोंथाइयारि रां बान्थानि खाबु दं ?",
    "आं माबोरै सरखारि नोगोरारिथिनि थाखै थिसाननो हागोन ?",
    "PM KISA बिथांखिनि सोमोन्दै फोरमाय ।",
    "बोराइ pension नि थाखाय मा मा फोरमान बिलाइनि गोनांथि जायो?",
  ],
  "ne-IN": [
    "आम्दानी प्रमाणपत्र बनाउन के के कागजात चाहिन्छ?",
    "छात्रवृत्तिको लागि मेरो योग्यता छ कि छैन?",
    "PM-KISAN योजनाको बारेमा बताउनुहोस्",
    "बृद्धावस्था भत्ताको लागि कसरी आवेदन दिने?",
  ],
  "mni-IN": [
    "Income certificate gi damak karamba che-changsing changbage?",
    "Eigi scholarship ki damak medha yogya oibra?",
    "PM-KISAN scheme gi maramda takpiyu",
    "Ahal singgi pension gi damak karamna apply tougani?",
  ],
};

/* ── Center branding (per language) ── */
const CENTER_BRANDING: Record<"en-IN" | "as-IN" | "brx-IN" | "ne-IN" | "mni-IN", string> = {
  "en-IN": "ManuhSathi AI",
  "as-IN": "মানুহসাথী AI",
  "brx-IN": "मानुहसाथि AI",
  "ne-IN": "मानुहसाथी AI",
  "mni-IN": "ManuhSathi AI",
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<
  "en-IN" | "as-IN" | "brx-IN" | "ne-IN" | "mni-IN"
>("en-IN");

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    async function createSession() {
      try {
        const response = await fetch("/api/session", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to create session");
        }

        const data = await response.json();
        setSessionId(data.session.session_id);
      } catch (error) {
        console.error("Session creation error:", error);
      }
    }

    createSession();
  }, []);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleNewChat() {
  try {
    setMessages([]);
    setInput("");

    const response = await fetch("/api/session", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to create session :(");
    }

    const data = await response.json();
    setSessionId(data.session.session_id);
  } catch (error) {
    console.error("New chat error:", error);
  }
}
async function transcribeRecording(blob: Blob) {
  setTranscribing(true);

  try {
    const formData = new FormData();

    const file = new File(
      [blob],
      "recording.webm",
      {
        type: "audio/webm",
      },
    );

    formData.append("audio", file);
    formData.append("language", language);

    const response = await fetch("/api/speech/stt", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Speech recognition failed",
      );
    }

    if (!data.transcript?.trim()) {
      throw new Error("No speech detected");
    }

    setInput(data.transcript);
  } catch (error) {
    console.error("Speech-to-text error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Could not transcribe the recording.",
    );
  } finally {
    setTranscribing(false);
  }
}

async function toggleRecording() {
  if (recording) {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    return;
  }

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    mediaStreamRef.current = stream;
    audioChunksRef.current = [];

    const recorder = new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(
        audioChunksRef.current,
        {
          type: recorder.mimeType || "audio/webm",
        },
      );

      stream.getTracks().forEach((track) =>
        track.stop(),
      );

      mediaStreamRef.current = null;

      await transcribeRecording(blob);
    };

    recorder.start();
    setRecording(true);
  } catch (error) {
    console.error("Microphone error:", error);

    alert(
      "Could not access the microphone. Please check your browser permission.",
    );
  }
}


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: message,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Chat request failed");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer,
          structured: data.structured,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while processing your message.",
          structured: undefined,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* ── Helper: submit a starter prompt ── */
  function handleStarterClick(prompt: string) {
    setInput(prompt);
    /* Use a microtask so the input state is set before form submission */
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement | null;
      if (form) form.requestSubmit();
    }, 0);
  }

  /* ── Render ── */
  return (
    <main
      className="ms-viewport-height"
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: "760px",
        margin: "0 auto",
        width: "100%",
        fontFamily: "var(--ms-font-sans)",
      }}
    >
      {/* ═══════════ HEADER ═══════════ */}
      <header
        className="ms-header-wrap"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--ms-border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <h1
            style={{
              fontFamily: "var(--ms-font-serif)",
              fontSize: "1.35rem",
              fontWeight: 400,
              color: "var(--ms-text-primary)",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            ManuhSathi AI
          </h1>
          <span
            className="ms-header-brand-subtitle"
            style={{
              fontSize: "0.75rem",
              color: "var(--ms-text-tertiary)",
              fontWeight: 400,
            }}
          >
            Public-service assistant
          </span>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Language selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              background: "var(--ms-bg-secondary)",
              borderRadius: "var(--ms-radius)",
              padding: "3px",
            }}
          >
            {(["en-IN", "as-IN", "brx-IN", "ne-IN", "mni-IN"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                disabled={loading || recording || transcribing}
                aria-label={`Switch to ${lang === "en-IN" ? "English" : lang === "as-IN" ? "Assamese" : lang === "brx-IN" ? "Bodo" : lang === "ne-IN" ? "Nepali" : "Manipuri"}`}
                aria-pressed={language === lang}
                className="ms-lang-btn"
                style={{
                  padding: "5px 12px",
                  fontSize: "0.75rem",
                  fontWeight: language === lang ? 500 : 400,
                  borderRadius: "var(--ms-radius-sm)",
                  border: "none",
                  cursor: loading || recording || transcribing ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  background: language === lang ? "var(--ms-accent-muted)" : "transparent",
                  color: language === lang ? "var(--ms-accent-hover)" : "var(--ms-text-secondary)",
                  opacity: loading || recording || transcribing ? 0.5 : 1,
                }}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>

          {/* New Chat */}
          <button
            type="button"
            onClick={handleNewChat}
            aria-label="Start new conversation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 400,
              borderRadius: "var(--ms-radius)",
              border: "1px solid var(--ms-border)",
              background: "transparent",
              color: "var(--ms-text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ms-accent)";
              e.currentTarget.style.color = "var(--ms-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ms-border)";
              e.currentTarget.style.color = "var(--ms-text-secondary)";
            }}
          >
            {/* Plus icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
        </div>
      </header>

      {/* ═══════════ CHAT AREA ═══════════ */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
        }}
      >
        {/* ── Empty State ── */}
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <h2
              className="ms-empty-heading"
              style={{
                fontFamily: "var(--ms-font-serif)",
                fontSize: "2.2rem",
                fontWeight: 400,
                color: "var(--ms-text-primary)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {CENTER_BRANDING[language]}
            </h2>
            <p
              className="ms-empty-desc"
              style={{
                fontSize: "0.95rem",
                color: "var(--ms-text-secondary)",
                maxWidth: "420px",
                lineHeight: 1.6,
                marginTop: "6px",
                padding: "0 8px",
              }}
            >
              A multilingual assistant that helps you understand
              government services, eligibility, documents and
              application steps.
            </p>

            {/* Starter prompts */}
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--ms-text-tertiary)",
                margin: 0,
                marginTop: "28px",
                marginBottom: "10px",
                letterSpacing: "0.01em",
                padding: "0 8px",
              }}
            >
              Try these sample prompts
            </p>
            <div
              className="ms-starter-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "8px",
                maxWidth: "520px",
                width: "100%",
                padding: "0 8px",
              }}
            >
              {STARTER_PROMPTS_BY_LANG[language].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleStarterClick(prompt)}
                  disabled={loading || !sessionId}
                  style={{
                    padding: "12px 16px",
                    fontSize: "0.82rem",
                    color: "var(--ms-text-secondary)",
                    background: "var(--ms-bg-secondary)",
                    border: "1px solid var(--ms-border-subtle)",
                    borderRadius: "var(--ms-radius)",
                    cursor: loading || !sessionId ? "not-allowed" : "pointer",
                    textAlign: "left",
                    lineHeight: 1.45,
                    transition: "all 0.2s ease",
                    opacity: loading || !sessionId ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && sessionId) {
                      e.currentTarget.style.borderColor = "var(--ms-accent)";
                      e.currentTarget.style.color = "var(--ms-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--ms-border-subtle)";
                    e.currentTarget.style.color = "var(--ms-text-secondary)";
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        {messages.map((message, index) => (
          <div
            key={index}
            className="ms-message-enter"
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "20px",
            }}
          >
            {message.role === "user" ? (
              /* ── User message ── */
              <div
                style={{
                  maxWidth: "75%",
                  padding: "12px 16px",
                  background: "var(--ms-user-bg)",
                  borderRadius: "var(--ms-radius-lg) var(--ms-radius-lg) var(--ms-radius-sm) var(--ms-radius-lg)",
                  color: "var(--ms-text-primary)",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {message.content}
              </div>
            ) : (
              /* ── Assistant message ── */
              <div style={{ maxWidth: "min(85%, 100%)", width: "100%" }}>
                {/* Label */}
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    color: "var(--ms-accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  ManuhSathi
                </div>

                {/* Content */}
                <div
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    color: "var(--ms-text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {message.content}
                </div>

                {/* ── Structured Response ── */}
                {message.structured && (
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

                    {/* Eligibility */}
                    {message.structured.eligibility && (
                      <div
                        className="ms-structured-card"
                        style={{
                          padding: "14px 16px",
                          background: "var(--ms-bg-tertiary)",
                          borderRadius: "var(--ms-radius)",
                          borderLeft: "3px solid var(--ms-accent)",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "var(--ms-font-serif)",
                            fontSize: "0.92rem",
                            fontWeight: 400,
                            color: "var(--ms-text-primary)",
                            margin: "0 0 8px 0",
                          }}
                        >
                          Eligibility
                        </h3>
                        <p
                          style={{
                            fontSize: "0.84rem",
                            lineHeight: 1.65,
                            color: "var(--ms-text-secondary)",
                            margin: 0,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {message.structured.eligibility}
                        </p>
                      </div>
                    )}

                    {/* Documents */}
                    {message.structured.documents.length > 0 && (
                      <div
                        className="ms-structured-card"
                        style={{
                          padding: "14px 16px",
                          background: "var(--ms-bg-tertiary)",
                          borderRadius: "var(--ms-radius)",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "var(--ms-font-serif)",
                            fontSize: "0.92rem",
                            fontWeight: 400,
                            color: "var(--ms-text-primary)",
                            margin: "0 0 10px 0",
                          }}
                        >
                          Required Documents
                        </h3>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "0",
                            listStyle: "none",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {message.structured.documents.map((document, documentIndex) => (
                            <li
                              key={documentIndex}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "8px",
                                fontSize: "0.84rem",
                                lineHeight: 1.55,
                                color: "var(--ms-text-secondary)",
                              }}
                            >
                              {/* Document marker */}
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  background: "var(--ms-accent)",
                                  marginTop: "7px",
                                  flexShrink: 0,
                                }}
                              />
                              {document}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Application Steps */}
                    {message.structured.steps.length > 0 && (
                      <div
                        className="ms-structured-card"
                        style={{
                          padding: "14px 16px",
                          background: "var(--ms-bg-tertiary)",
                          borderRadius: "var(--ms-radius)",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "var(--ms-font-serif)",
                            fontSize: "0.92rem",
                            fontWeight: 400,
                            color: "var(--ms-text-primary)",
                            margin: "0 0 12px 0",
                          }}
                        >
                          Application Steps
                        </h3>
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: "0",
                            listStyle: "none",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          {message.structured.steps.map((step, stepIndex) => (
                            <li
                              key={stepIndex}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "12px",
                                fontSize: "0.84rem",
                                lineHeight: 1.55,
                                color: "var(--ms-text-secondary)",
                              }}
                            >
                              {/* Step number */}
                              <span
                                style={{
                                  fontFamily: "var(--ms-font-serif)",
                                  fontSize: "0.8rem",
                                  fontWeight: 400,
                                  color: "var(--ms-accent)",
                                  minWidth: "22px",
                                  paddingTop: "1px",
                                }}
                              >
                                {String(stepIndex + 1).padStart(2, "0")}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Timeline */}
                    {message.structured.timeline && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          background: "var(--ms-bg-tertiary)",
                          borderRadius: "var(--ms-radius)",
                          fontSize: "0.82rem",
                          color: "var(--ms-text-secondary)",
                        }}
                      >
                        {/* Clock icon */}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--ms-accent)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span style={{ whiteSpace: "pre-wrap" }}>{message.structured.timeline}</span>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <p
                      style={{
                        fontSize: "0.72rem",
                        lineHeight: 1.5,
                        color: "var(--ms-text-tertiary)",
                        margin: 0,
                        paddingTop: "4px",
                        borderTop: "1px solid var(--ms-border-subtle)",
                      }}
                    >
                      This information is for general guidance only. Please verify details with the relevant government authority.
                    </p>
                  </div>
                )}

                {/* ── TTS Listen Button ── */}
                <ListenButton
                  text={message.content}
                  structured={message.structured}
                  language={language}
                  messageIndex={index}
                />
              </div>
            )}
          </div>
        ))}

        {/* ── Loading ── */}
        {loading && (
          <div
            className="ms-message-enter"
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  color: "var(--ms-accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                ManuhSathi
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--ms-text-tertiary)",
                  fontSize: "0.84rem",
                }}
              >
                <span>Thinking</span>
                <span style={{ display: "flex", gap: "3px" }}>
                  <span className="ms-thinking-dot" />
                  <span className="ms-thinking-dot" />
                  <span className="ms-thinking-dot" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ INPUT AREA ═══════════ */}
      <div
        className="ms-input-wrapper ms-safe-bottom"
        style={{
          flexShrink: 0,
          padding: "12px 16px 20px",
          borderTop: "1px solid var(--ms-border-subtle)",
        }}
      >
        <form
          id="chat-form"
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            background: "var(--ms-bg-secondary)",
            borderRadius: "var(--ms-radius-lg)",
            border: "1px solid var(--ms-border)",
            padding: "8px 8px 8px 14px",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--ms-accent)";
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--ms-border)";
            }
          }}
        >
          {/* Textarea */}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                if (form) form.requestSubmit();
              }
            }}
            placeholder="Ask about a government scheme..."
            disabled={loading || !sessionId}
            rows={1}
            aria-label="Type your message"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: "var(--ms-text-primary)",
              fontSize: "0.88rem",
              lineHeight: 1.55,
              padding: "6px 0",
              maxHeight: "120px",
              fontFamily: "var(--ms-font-sans)",
            }}
          />

          {/* Microphone button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={
              loading ||
              !sessionId ||
              transcribing
            }
            aria-label={
              transcribing
                ? "Processing speech"
                : recording
                  ? "Stop recording"
                  : "Record voice message"
            }
            className={recording ? "ms-recording-active" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              minWidth: "40px",
              minHeight: "40px",
              borderRadius: "50%",
              border: "none",
              cursor: loading || !sessionId || transcribing ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              background: recording
                ? "var(--ms-recording-bg)"
                : transcribing
                  ? "var(--ms-bg-tertiary)"
                  : "transparent",
              color: recording
                ? "var(--ms-recording)"
                : "var(--ms-text-secondary)",
              opacity: loading || !sessionId || transcribing ? 0.4 : 1,
            }}
          >
            {transcribing ? (
              /* Processing dots */
              <span style={{ display: "flex", gap: "2px" }}>
                <span className="ms-thinking-dot" />
                <span className="ms-thinking-dot" />
                <span className="ms-thinking-dot" />
              </span>
            ) : recording ? (
              /* Stop icon */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              /* Mic icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={loading || !sessionId || !input.trim()}
            aria-label={loading ? "Sending message" : "Send message"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              minWidth: "40px",
              minHeight: "40px",
              borderRadius: "50%",
              border: "none",
              cursor: loading || !sessionId || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              background:
                loading || !sessionId || !input.trim()
                  ? "var(--ms-bg-tertiary)"
                  : "var(--ms-accent)",
              color:
                loading || !sessionId || !input.trim()
                  ? "var(--ms-text-tertiary)"
                  : "var(--ms-bg-primary)",
              opacity: loading || !sessionId || !input.trim() ? 0.5 : 1,
            }}
          >
            {loading ? (
              /* Loading dots */
              <span style={{ display: "flex", gap: "2px" }}>
                <span className="ms-thinking-dot" />
                <span className="ms-thinking-dot" />
              </span>
            ) : (
              /* Send arrow */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </form>

        {/* Recording indicator */}
        {recording && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "8px",
              fontSize: "0.75rem",
              color: "var(--ms-recording)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--ms-recording)",
                animation: "ms-pulse 1s ease-in-out infinite",
              }}
            />
            Recording — tap the mic to stop
          </div>
        )}

        {/* Transcribing indicator */}
        {transcribing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "8px",
              fontSize: "0.75rem",
              color: "var(--ms-text-tertiary)",
            }}
          >
            Transcribing your speech…
          </div>
        )}
      </div>
    </main>
  );
}
