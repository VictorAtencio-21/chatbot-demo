"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface OrderSummary {
  items: string[];
  total: string;
}

interface Msg {
  id: number;
  from: "bot" | "user";
  text: string;
  streaming?: boolean;
  orderSummary?: OrderSummary;
  isLeadCard?: boolean;
}

interface LeadData {
  name?: string;
  email?: string;
  interest?: string;
}

const STARTER_CHIPS = [
  "🥖 Today's Menu",
  "🎂 Custom Cake Quote",
  "🕒 Hours & Location",
  "🚚 Catering & Events",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyParent(event: "open" | "close") {
  try {
    window.parent.postMessage({ source: "gc-chat-widget", event }, "*");
  } catch {
    /* not embedded */
  }
}

function parseOrderString(text: string): OrderSummary | null {
  if (!text.toLowerCase().startsWith("order:")) return null;
  try {
    const afterOrder = text.slice(6).trim();
    const totalMatch = afterOrder.match(/\(total\s+([$0-9.]+)\)/i);
    const total = totalMatch ? totalMatch[1] : "";
    const itemsPart = afterOrder.replace(/\(total.*?\)/i, "").trim();
    const items = itemsPart
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { items, total };
  } catch {
    return null;
  }
}

export default function WidgetPage() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [lead, setLead] = useState<LeadData>({});
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [provider, setProvider] = useState<string>("gemini");
  const [prefillOrder, setPrefillOrder] = useState<string | null>(null);

  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const nextId = () => {
    idRef.current += 1;
    return idRef.current;
  };

  const initGreeting = useCallback(() => {
    setMsgs([
      {
        id: nextId(),
        from: "bot",
        text: "Hi there! 👋 Welcome to Golden Crust Bakery. Ask me anything about our oven-fresh breads, custom cakes, or catering!",
      },
    ]);
  }, []);

  const openPanel = useCallback(
    (interest: string | null) => {
      setOpen(true);
      setHasOpened(true);
      notifyParent("open");
      if (interest) {
        setPrefillOrder(interest);
      }
    },
    []
  );

  const closePanel = useCallback(() => {
    setOpen(false);
    notifyParent("close");
  }, []);

  const resetChat = useCallback(() => {
    idRef.current = 0;
    setLead({});
    setLeadSubmitted(false);
    setPrefillOrder(null);
    setInput("");
    setTyping(false);
    initGreeting();
  }, [initGreeting]);

  // Initial greeting & transparent canvas
  useEffect(() => {
    document.documentElement.classList.add("gc-widget-frame");
    document.body.classList.add("gc-widget-frame");
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    if (!open || startedRef.current) return;
    startedRef.current = true;
    initGreeting();
  }, [open, initGreeting]);

  // Direct visit to /widget auto-opens
  useEffect(() => {
    try {
      if (window.self === window.top && !startedRef.current) {
        startedRef.current = true;
        setOpen(true);
        initGreeting();
      }
    } catch {
      /* cross-origin */
    }
  }, [initGreeting]);

  // Snippet messages
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "gc-chat-snippet") return;
      if (d.event === "open-panel") openPanel(d.interest ?? null);
      if (d.event === "close-panel") closePanel();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [openPanel, closePanel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing, open]);

  // Submit collected lead to webhook
  const submitLeadToWebhook = useCallback(
    async (leadData: LeadData) => {
      if (leadSubmitted || !leadData.name || !leadData.email) return;
      if (!EMAIL_RE.test(leadData.email)) return;

      setLeadSubmitted(true);
      const isOrder = Boolean(
        leadData.interest?.toLowerCase().includes("order:") ||
        leadData.interest?.toLowerCase().includes("total $")
      );
      const payload = {
        name: leadData.name.trim(),
        email: leadData.email.trim().toLowerCase(),
        interest: leadData.interest?.trim() || "Bakery Inquiry",
        source: isOrder ? "cart-checkout" : "chat-lead",
        timestamp: new Date().toISOString(),
      };

      try {
        const res = await fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setMsgs((m) => [
            ...m,
            {
              id: nextId(),
              from: "bot",
              text: "",
              isLeadCard: true,
            },
          ]);
        }
      } catch (err) {
        console.warn("Webhook submit error:", err);
      }
    },
    [leadSubmitted]
  );

  // Handle cart checkout prefill
  useEffect(() => {
    if (prefillOrder && open) {
      const orderSummary = parseOrderString(prefillOrder);
      const value = prefillOrder;
      setPrefillOrder(null);

      // Add user message
      setMsgs((m) => [
        ...m,
        {
          id: nextId(),
          from: "user",
          text: value,
          orderSummary: orderSummary ?? undefined,
        },
      ]);

      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        setMsgs((m) => [
          ...m,
          {
            id: nextId(),
            from: "bot",
            text: "I've logged your pickup order! 🍞 To notify you when it's hot and ready from the oven, what's your full name and best email address?",
          },
        ]);
        setLead((prev) => ({ ...prev, interest: value }));
      }, 700);
    }
  }, [prefillOrder, open]);

  // Send message to conversational API with real-time token streaming
  const handleSend = async (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;

    const userMsg: Msg = { id: nextId(), from: "user", text };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setTyping(true);

    try {
      const chatPayload = {
        messages: newMsgs.map((m) => ({
          role: m.from === "bot" ? "assistant" : "user",
          content: m.text,
        })),
        leadData: lead,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream connection failed");
      }

      const botMsgId = nextId();
      // Insert placeholder bot message and turn off typing dots
      setMsgs((m) => [
        ...m,
        { id: botMsgId, from: "bot", text: "", streaming: true },
      ]);
      setTyping(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let finalLead: LeadData = { ...lead };
      let isLeadComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "token") {
              accumulatedText += data.text;
              setMsgs((currentMsgs) =>
                currentMsgs.map((m) =>
                  m.id === botMsgId ? { ...m, text: accumulatedText } : m
                )
              );
            } else if (data.type === "done") {
              if (data.provider) setProvider(data.provider);
              if (data.lead) {
                finalLead = {
                  name: data.lead.name || finalLead.name,
                  email: data.lead.email || finalLead.email,
                  interest: data.lead.interest || finalLead.interest,
                };
                setLead(finalLead);
                isLeadComplete = Boolean(data.isComplete);
              }
            }
          } catch {
            /* ignore JSON parse errors in chunk */
          }
        }
      }

      // Finish streaming for this message
      setMsgs((currentMsgs) =>
        currentMsgs.map((m) =>
          m.id === botMsgId ? { ...m, streaming: false } : m
        )
      );

      // If lead is now complete, trigger webhook!
      if (isLeadComplete && !leadSubmitted) {
        submitLeadToWebhook(finalLead);
      }
    } catch {
      setTyping(false);
      setMsgs((m) => [
        ...m,
        {
          id: nextId(),
          from: "bot",
          text: "Thanks for reaching out! Our bakers are available Monday through Saturday. What is your name and email so we can follow up?",
        },
      ]);
    }
  };

  const getProviderLabel = () => {
    if (provider === "gemini") return "Gemini AI · Online";
    if (provider === "groq") return "Llama 3.3 AI · Online";
    return "Bakery AI · Online";
  };

  return (
    <div id="gc-widget-root" className="h-dvh w-full bg-transparent font-sans">
      {!open ? (
        <div className="flex h-full w-full items-center justify-center p-2">
          <button
            onClick={() => openPanel(null)}
            aria-label="Open chat"
            title="Chat with Golden Crust Bakery"
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-500 text-white shadow-[0_8px_20px_rgba(217,119,6,0.45)] ring-2 ring-white/60 transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_28px_rgba(217,119,6,0.6)] active:scale-95"
          >
            {/* Ambient subtle glow pulse behind button */}
            <span className="absolute -inset-1 -z-10 rounded-full bg-amber-500/35 blur-md transition-all duration-300 group-hover:bg-amber-500/60 group-hover:blur-lg animate-pulse" />

            {/* Inner gloss highlight ring */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

            {/* Razor-sharp filled Chat Bubble Icon with 3 crisp dots */}
            <svg
              className="h-7 w-7 text-white transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9s-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .444 1.223ZM8.25 10.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm3.75 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm3.75 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
                clipRule="evenodd"
              />
            </svg>

            {/* Unread message badge ("1") */}
            {!hasOpened && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10.5px] font-black text-white shadow-md ring-2 ring-white gc-badge-pulse">
                1
              </span>
            )}

            {/* Online status indicator dot with ping animation */}
            <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
            </span>
          </button>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600 px-4 py-3 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-amber-900/40 text-lg ring-1 ring-white/20">
                <span>🥖</span>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-amber-800 bg-emerald-400" />
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight tracking-wide">
                  Golden Crust Assistant
                </p>
                <p className="text-[11px] font-medium text-amber-200/90">
                  {getProviderLabel()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                title="Restart conversation"
                aria-label="Restart chat"
                className="rounded-full p-1.5 text-amber-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                onClick={closePanel}
                aria-label="Close chat"
                className="rounded-full p-1.5 text-amber-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-2.5 overflow-y-auto bg-amber-50/50 p-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`gc-msg-in flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Special Lead Webhook Success Card */}
                {m.isLeadCard ? (
                  <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                        ✓
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Lead Dispatched to Webhook
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-stone-700">
                      <p>
                        <strong className="text-stone-900">Name:</strong>{" "}
                        {lead.name || "Customer"}
                      </p>
                      <p>
                        <strong className="text-stone-900">Email:</strong>{" "}
                        {lead.email}
                      </p>
                      <p>
                        <strong className="text-stone-900">Interest:</strong>{" "}
                        {lead.interest || "Bakery inquiry"}
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-[11px] text-emerald-700">
                      <span>Status: 201 Created</span>
                      <a
                        href="/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline hover:text-emerald-900"
                      >
                        View in Dashboard →
                      </a>
                    </div>
                  </div>
                ) : m.orderSummary ? (
                  /* Order Receipt Card */
                  <div className="w-full max-w-[85%] rounded-2xl rounded-br-md border border-amber-300 bg-amber-100/90 p-3 shadow-sm text-stone-800">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-amber-900">
                        🛒 Checkout via Chat
                      </span>
                      <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        Pickup
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs">
                      {m.orderSummary.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {m.orderSummary.total && (
                      <div className="mt-2 flex justify-between border-t border-amber-200/70 pt-1.5 text-xs font-bold text-amber-950">
                        <span>Total:</span>
                        <span>{m.orderSummary.total}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Text Bubble */
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm ${
                      m.from === "user"
                        ? "rounded-br-sm bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                        : "rounded-bl-sm border border-stone-200/70 bg-white text-stone-800"
                    }`}
                  >
                    <span>{m.text}</span>
                    {m.streaming && (
                      <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-amber-600 align-middle" />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-stone-200/70 bg-white px-3.5 py-2.5 shadow-sm">
                  <span className="gc-typing-dot h-1.5 w-1.5 rounded-full bg-amber-600" />
                  <span className="gc-typing-dot h-1.5 w-1.5 rounded-full bg-amber-600" />
                  <span className="gc-typing-dot h-1.5 w-1.5 rounded-full bg-amber-600" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick-Reply Starter Chips */}
          {msgs.length <= 1 && !typing && (
            <div className="border-t border-amber-100 bg-white/95 px-3 py-2">
              <p className="mb-1.5 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Popular inquiries:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 hover:border-amber-400 active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2 border-t border-amber-100 bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or share your details…"
              className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm outline-none transition-colors focus:border-amber-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm transition-all hover:bg-amber-700 disabled:opacity-40"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
