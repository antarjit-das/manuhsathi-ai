"use client";

import { useRef, useState } from "react";

type MicrophoneButtonProps = {
  language: "en-IN" | "as-IN" | "brx-IN" | "ne-IN";
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export function MicrophoneButton({
  language,
  onTranscript,
  disabled = false,
}: MicrophoneButtonProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    try {
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone is not supported by this browser.");
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        await sendAudio(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);

      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not access the microphone.",
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
    setIsRecording(false);
    setIsProcessing(true);
  }

  async function sendAudio(blob: Blob) {
    try {
      const formData = new FormData();

      const extension = blob.type.includes("webm") ? "webm" : "audio";

      formData.append(
        "audio",
        new File([blob], `recording.${extension}`, {
          type: blob.type,
        }),
      );

      formData.append("language", language);

      const response = await fetch("/api/speech/stt", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Speech recognition failed.");
      }

      if (!data.transcript?.trim()) {
        throw new Error("No speech was detected.");
      }

      onTranscript(data.transcript);
    } catch (err) {
      console.error("STT error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not understand the audio.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleClick() {
    if (isProcessing || disabled) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        aria-label={
          isRecording
            ? "Stop recording"
            : isProcessing
              ? "Processing recording"
              : "Record voice message"
        }
        className="rounded-full p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="text-sm">...</span>
        ) : isRecording ? (
          <span className="text-red-500">■</span>
        ) : (
          <span>🎤</span>
        )}
      </button>

      {error && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-md bg-red-50 p-2 text-xs text-red-700 shadow">
          {error}
        </div>
      )}
    </div>
  );
}