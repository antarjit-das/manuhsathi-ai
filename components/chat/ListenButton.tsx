"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* ─── Types ─── */

type ListenButtonProps = {
  /** The raw assistant message content */
  text: string;
  /** Structured response data for richer speech synthesis */
  structured?: {
    eligibility?: string;
    documents?: string[];
    steps?: string[];
    timeline?: string;
  };
  /** Current language code: "en-IN" | "as-IN" | "brx-IN" | "ne-IN" | "mni-IN" */
  language: "en-IN" | "as-IN" | "brx-IN" | "ne-IN" | "mni-IN";
  /** Unique key for this message to manage the global audio singleton */
  messageIndex: number;
};

/* ─── Language mapping: app locale → TTS language code ─── */

const LANG_MAP: Record<string, string> = {
  "en-IN": "en",
  "as-IN": "as",
  "brx-IN": "brx",
  "ne-IN": "ne",
  "mni-IN": "mni",
};

/* ─── Global audio singleton ─── */
/* Only one TTS audio can play at a time. We track the currently
   playing instance so clicking Listen on a different message
   stops the previous one first. */

let globalAudio: HTMLAudioElement | null = null;
let globalPlayingId: string | null = null;
let globalStopCallback: (() => void) | null = null;

function stopGlobalAudio() {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
  }
  if (globalStopCallback) {
    globalStopCallback();
    globalStopCallback = null;
  }
  globalPlayingId = null;
}

/* ─── States ─── */

type ButtonState = "idle" | "loading" | "playing" | "error";

/* ─── Component ─── */

export default function ListenButton({
  text,
  structured,
  language,
  messageIndex,
}: ListenButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const instanceId = `tts-${messageIndex}`;

  /* Cache: store fetched audio blob per message so repeated clicks
     don't re-call the API */
  const cachedBlobRef = useRef<Blob | null>(null);

  /* Clean up object URL and audio on unmount */
  useEffect(() => {
    return () => {
      if (globalPlayingId === instanceId) {
        stopGlobalAudio();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [instanceId]);

  /* Automatically return to idle after error */
  useEffect(() => {
    if (state === "error") {
      const timer = setTimeout(() => setState("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const playBlob = useCallback((blob: Blob) => {
    /* Revoke previous object URL if any */
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    /* Register as global singleton */
    globalAudio = audio;
    globalPlayingId = instanceId;
    globalStopCallback = () => setState("idle");

    audio.onplay = () => setState("playing");

    audio.onended = () => {
      setState("idle");
      if (globalPlayingId === instanceId) {
        globalPlayingId = null;
        globalAudio = null;
        globalStopCallback = null;
      }
    };

    audio.onerror = () => {
      console.error("Audio playback error");
      setState("error");
      if (globalPlayingId === instanceId) {
        globalPlayingId = null;
        globalAudio = null;
        globalStopCallback = null;
      }
    };

    audio.play().catch(() => {
      setState("error");
    });
  }, [instanceId]);

  const handleClick = useCallback(async () => {
    /* If this message is currently playing → stop it */
    if (state === "playing" && globalPlayingId === instanceId) {
      stopGlobalAudio();
      setState("idle");
      return;
    }

    /* Stop any other playing audio first */
    stopGlobalAudio();

    /* If we already have cached audio, replay it */
    if (cachedBlobRef.current) {
      playBlob(cachedBlobRef.current);
      return;
    }

    /* Fetch new audio */
    setState("loading");

    try {
      const ttsLang = LANG_MAP[language] || "en";

      const response = await fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: ttsLang,
          structured,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Empty audio response");
      }

      cachedBlobRef.current = blob;
      playBlob(blob);
    } catch (error) {
      console.error("TTS error:", error);
      setState("error");
    }
  }, [state, instanceId, language, text, structured, playBlob]);

  /* ─── Render ─── */

  const label =
    state === "loading"
      ? "Loading…"
      : state === "playing"
        ? "Stop"
        : state === "error"
          ? "Voice unavailable"
          : "Listen";

  const ariaLabel =
    state === "loading"
      ? "Loading speech audio"
      : state === "playing"
        ? "Stop audio playback"
        : state === "error"
          ? "Voice unavailable"
          : "Listen to this response";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      aria-label={ariaLabel}
      id={`listen-btn-${messageIndex}`}
      className="ms-listen-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        fontSize: "0.75rem",
        fontWeight: 400,
        fontFamily: "var(--ms-font-sans)",
        borderRadius: "var(--ms-radius)",
        border: "1px solid var(--ms-border-subtle)",
        background:
          state === "playing"
            ? "var(--ms-accent-muted)"
            : "transparent",
        color:
          state === "error"
            ? "var(--ms-error)"
            : state === "playing"
              ? "var(--ms-accent-hover)"
              : "var(--ms-text-tertiary)",
        cursor:
          state === "loading"
            ? "wait"
            : state === "error"
              ? "default"
              : "pointer",
        transition: "all 0.2s ease",
        opacity: state === "loading" ? 0.7 : 1,
        marginTop: "8px",
      }}
      onMouseEnter={(e) => {
        if (state === "idle") {
          e.currentTarget.style.borderColor = "var(--ms-accent)";
          e.currentTarget.style.color = "var(--ms-text-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (state === "idle") {
          e.currentTarget.style.borderColor = "var(--ms-border-subtle)";
          e.currentTarget.style.color = "var(--ms-text-tertiary)";
        }
      }}
    >
      {/* Icon */}
      {state === "loading" ? (
        /* Spinner */
        <span
          style={{
            display: "inline-block",
            width: "12px",
            height: "12px",
            border: "1.5px solid var(--ms-text-tertiary)",
            borderTopColor: "var(--ms-accent)",
            borderRadius: "50%",
            animation: "ms-spin 0.6s linear infinite",
          }}
        />
      ) : state === "playing" ? (
        /* Stop icon */
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : state === "error" ? (
        /* Warning icon */
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ) : (
        /* Speaker icon 🔊 */
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
      {label}
    </button>
  );
}
