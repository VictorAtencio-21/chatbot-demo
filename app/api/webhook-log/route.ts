import { NextResponse } from "next/server";
import { readJson, type WebhookLogEntry } from "@/app/lib/store";

export const dynamic = "force-dynamic";

/** Raw webhook hit log (accepted + rejected), newest first. */
export async function GET() {
  const entries = await readJson<WebhookLogEntry[]>("webhook-log.json", []);
  const sorted = [...entries].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt)
  );
  return NextResponse.json({ ok: true, count: sorted.length, entries: sorted });
}
