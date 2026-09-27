# Chatbot Integration Prototype

A working end-to-end demo of the **"AI Chatbot Website & API Integration"** trial deliverables:

1. **Embed an existing chatbot on a test site** via a one-line copy-paste snippet.
2. **Verify contact data collection** through a guided chat conversation (name → validated email → interest).
3. **Connect & test a simple API/webhook** that receives, validates, stores, and logs every lead as JSON.
4. **Troubleshooting notes** (see below) covering the real integration pitfalls handled in the code.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**. Everything is real, working code — no placeholders.

> 📋 **Upwork Job Requirements Verification:** See [UPWORK_DELIVERABLES.md](./UPWORK_DELIVERABLES.md) for a direct mapping of every test task from the job posting to its working implementation in this repository.

## Run it locally

```bash
npm install
npm run dev
```

### Optional: Connect Real Gemini 2.0 AI (100% Free)
The chatbot includes an intelligent local bakery knowledge engine out of the box with zero setup. To power it with live **Google Gemini 2.0 Flash AI**:

1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey) (takes 30 seconds, no credit card required).
2. Create `.env.local` in the project root:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
3. Restart `npm run dev` — the widget automatically switches to Gemini 2.0 Flash!

Then open:

| URL | What it is |
|---|---|
| `http://localhost:3000` | Demo small-business site ("Golden Crust Bakery") with the chatbot embedded via the snippet |
| `http://localhost:3000/widget` | The chat widget standalone |
| `http://localhost:3000/dashboard` | Integration dashboard: contact table, raw webhook log, health indicator, test-webhook button |

**Try the full flow:** open the demo site → click the chat bubble (bottom-right) → ask questions about breads/cakes or click a quick chip → share name and email → open `/dashboard` and watch your lead appear in real time!

## Deploy to Vercel

```bash
npx vercel
```

(or push to GitHub and import the repo in the Vercel dashboard — add `GEMINI_API_KEY` under Environment Variables if desired, or let it run on the smart fallback engine).

> **Note:** contacts are stored as JSON files under `data/` for the prototype. That works on any single server, but on Vercel's serverless functions the filesystem is ephemeral — for production, swap `app/lib/store.ts` for Vercel KV, Postgres, or any database (the API route contracts stay the same).

## Trial deliverable → file mapping

| Trial requirement | Implemented in |
|---|---|
| Embed chatbot via code snippet | `public/chatbot-snippet.js` — vanilla-JS loader, works from the script tag alone on any page; embedded in `app/layout.tsx` as `<script src="/chatbot-snippet.js" data-key="demo"></script>` |
| Conversational AI API route | `app/api/chat/route.ts` — Gemini 2.0 Flash / Groq LLM integration with smart bakery fallback engine & automatic lead extraction |
| "How this was integrated" section with the exact snippet + copy button | `app/page.tsx` (Integration section) + `app/components/CopySnippet.tsx` |
| Chat widget UI & launcher | `app/widget/page.tsx` — Option A enterprise floating button with glow, status ping, unread counter, starter chips & order cards |
| Contact data collection & lead dispatch | `app/widget/page.tsx` → `submitLeadToWebhook()` automatically POSTs to `/api/webhook` upon capturing name + email |
| Webhook receiver: validate, store, proper status codes, log every hit | `app/api/webhook/route.ts` — `POST` returns `201` on accept / `400` on invalid payload with error details; `GET` is a health check |
| List stored contacts | `app/api/contacts/route.ts` — `GET` returns contacts newest-first |
| Integration dashboard proving end-to-end collection | `app/dashboard/page.tsx` — health indicator, contacts table, raw JSON payload log, "Send test webhook" button, auto-refresh every 5s |
| Raw webhook hit log endpoint | `app/api/webhook-log/route.ts` |

## Troubleshooting notes

Issues anticipated and handled in this prototype:

- **Snippet placed in `<head>` (no `<body>` yet):** the loader waits for `DOMContentLoaded` before injecting the iframe.
- **Double-injection:** a `window.__gcChatLoaded` guard prevents duplicate widgets if the snippet is pasted twice.
- **Widget iframe blocking page clicks when collapsed:** the loader resizes the iframe (84×84 collapsed ↔ 400×620 open) based on `postMessage` events from the widget, so the closed launcher never covers content.
- **Iframe still loading when the host page calls `open()`:** the snippet retries the `postMessage` after 700ms.
- **Invalid emails:** the widget re-asks with a clear message instead of submitting bad data; the webhook independently re-validates and returns `400` with reasons (defense in depth).
- **Network failure on submit:** the widget shows an error and lets the visitor retry without losing the conversation.
- **Stale dashboard data:** the dashboard polls every 5s and has a manual refresh; API routes use `export const dynamic = "force-dynamic"` so Next.js never serves cached contact data.
- **Cross-site embedding:** the snippet accepts a `data-widget-url` attribute so the same loader can point at a widget hosted on a different origin.
