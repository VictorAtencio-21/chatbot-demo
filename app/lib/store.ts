import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await ensureDir();
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

/** Append an item to a JSON array file; returns the new array length. */
export async function appendToArray(
  file: string,
  item: unknown
): Promise<number> {
  const arr = await readJson<unknown[]>(file, []);
  arr.push(item);
  await writeJson(file, arr);
  return arr.length;
}

export interface StoredContact {
  id: string;
  name: string;
  email: string;
  interest: string;
  source: string;
  timestamp: string;
  receivedAt: string;
}

export interface WebhookLogEntry {
  receivedAt: string;
  status: "accepted" | "rejected";
  contactId?: string;
  payload: unknown;
  error?: string;
}
