import { NextResponse } from "next/server";
import { readJson, type StoredContact } from "@/app/lib/store";

export const dynamic = "force-dynamic";

/** List stored contacts, newest first. */
export async function GET() {
  const contacts = await readJson<StoredContact[]>("contacts.json", []);
  const sorted = [...contacts].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt)
  );
  return NextResponse.json({ ok: true, count: sorted.length, contacts: sorted });
}
