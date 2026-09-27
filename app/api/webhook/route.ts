import { NextResponse } from "next/server";
import {
  appendToArray,
  readJson,
  type StoredContact,
  type WebhookLogEntry,
} from "@/app/lib/store";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WebhookPayload {
  name?: unknown;
  email?: unknown;
  interest?: unknown;
  source?: unknown;
  timestamp?: unknown;
}

function validate(body: WebhookPayload): string[] {
  const errors: string[] = [];
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.push("name must be a string of at least 2 characters");
  }
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
    errors.push("email must be a valid email address");
  }
  if (
    body.interest !== undefined &&
    (typeof body.interest !== "string" || body.interest.trim().length === 0)
  ) {
    errors.push("interest must be a non-empty string when provided");
  }
  if (typeof body.source !== "string" || body.source.trim().length === 0) {
    errors.push("source must be a non-empty string");
  }
  if (
    typeof body.timestamp !== "string" ||
    Number.isNaN(Date.parse(body.timestamp))
  ) {
    errors.push("timestamp must be an ISO date string");
  }
  return errors;
}

async function log(entry: WebhookLogEntry) {
  await appendToArray("webhook-log.json", entry);
}

/** Health check — used by the dashboard status indicator. */
export async function GET() {
  const contacts = await readJson<StoredContact[]>("contacts.json", []);
  const logEntries = await readJson<WebhookLogEntry[]>("webhook-log.json", []);
  return NextResponse.json({
    status: "ok",
    service: "chatbot-webhook",
    timestamp: new Date().toISOString(),
    contactsStored: contacts.length,
    eventsLogged: logEntries.length,
  });
}

/** Receive a lead from the chat widget (or any HTTP client). */
export async function POST(req: Request) {
  const receivedAt = new Date().toISOString();

  let body: WebhookPayload;
  try {
    body = (await req.json()) as WebhookPayload;
  } catch {
    await log({ receivedAt, status: "rejected", payload: null, error: "Invalid JSON body" });
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const errors = validate(body);
  if (errors.length > 0) {
    await log({
      receivedAt,
      status: "rejected",
      payload: body,
      error: errors.join("; "),
    });
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const contact: StoredContact = {
    id: crypto.randomUUID(),
    name: (body.name as string).trim(),
    email: (body.email as string).trim().toLowerCase(),
    interest:
      typeof body.interest === "string" && body.interest.trim().length > 0
        ? (body.interest as string).trim()
        : "Not specified",
    source: (body.source as string).trim(),
    timestamp: body.timestamp as string,
    receivedAt,
  };

  await appendToArray("contacts.json", contact);
  await log({
    receivedAt,
    status: "accepted",
    contactId: contact.id,
    payload: contact,
  });

  return NextResponse.json({ ok: true, id: contact.id }, { status: 201 });
}
