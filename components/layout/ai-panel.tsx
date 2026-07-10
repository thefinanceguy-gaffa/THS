"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "Which quotes are most likely to close this week?",
  "Who hasn't ordered in 6 months?",
  "Which clients owe us money?",
  "What's running low in inventory?",
];

interface Message {
  role: "ai" | "user";
  text: string;
}

const WELCOME: Message = {
  role: "ai",
  text: "Squad AI isn't connected yet — this panel is the scaffold for the OpenAI-backed Edge Function described in BUILD_ROADMAP.md Sprint 8. Once wired up, I'll answer questions scoped to exactly what your role can see.",
};

/** Right-hand AI assistant panel (README.md's "Squad AI"). Scaffold only —
 *  see WELCOME above for why messages are canned rather than live. */
export function AiPanel() {
  const open = useUiStore((s) => s.aiPanelOpen);
  const toggle = useUiStore((s) => s.toggleAiPanel);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "ai", text: "Thanks — once Squad AI is connected to a live model, this is where a real, RLS-scoped answer would appear." },
    ]);
    setDraft("");
  }

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 z-40 h-full w-[340px] shrink-0 border-l border-border bg-card transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="auto_awesome" className="text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Squad AI</span>
            <span className="text-[11px] text-muted-foreground">Connected to your data</span>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={toggle}>
          <MaterialIcon name="close" />
        </Button>
      </div>

      <div className="flex h-[calc(100%-3.5rem)] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                m.role === "ai" ? "bg-muted text-foreground" : "ml-auto bg-primary text-primary-foreground"
              )}
            >
              {m.text}
            </div>
          ))}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <Input placeholder="Ask Squad AI…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" size="icon">
            <MaterialIcon name="send" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
