"use client";

import { FormEvent, useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function handleNewChat() {
  try {
    setMessages([]);
    setInput("");

    const response = await fetch("/api/session", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const data = await response.json();
    setSessionId(data.session.session_id);
  } catch (error) {
    console.error("New chat error:", error);
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
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ManuhSathi AI</h1>
          <p className="mt-1 text-gray-600">
            Government scheme and public service assistant
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="rounded-lg border px-4 py-2"
        >
          New Chat
        </button>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4">
        {messages.length === 0 && (
          <p className="text-gray-500">
            Ask me about government schemes and public services.
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg p-3 ${
              message.role === "user"
                ? "ml-auto max-w-[80%] bg-blue-100"
                : "mr-auto max-w-[80%] bg-gray-100"
            }`}
          >
            <strong className="block text-sm">
              {message.role === "user" ? "You" : "ManuhSathi"}
            </strong>

            <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}

        {loading && (
          <div className="mr-auto rounded-lg bg-gray-100 p-3">
            ManuhSathi is thinking...
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about a government scheme..."
          disabled={loading || !sessionId}
          className="flex-1 rounded-lg border px-4 py-3 outline-none"
        />

        <button
          type="submit"
          disabled={loading || !sessionId || !input.trim()}
          className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
