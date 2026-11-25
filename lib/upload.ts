import { randomToken } from "@/lib/crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED: Record<string, string[]> = {
  image: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
  attachment: [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "application/pdf", "text/plain", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export async function saveUpload(
  file: File,
  kind: "image" | "attachment" = "image"
): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
  if (!file || typeof file.arrayBuffer !== "function") return { ok: false, error: "No file provided" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "File must be smaller than 5 MB" };
  if (!ALLOWED[kind].includes(file.type)) return { ok: false, error: "Unsupported file type" };

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  const name = `${randomToken(12)}.${ext || "bin"}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, url: `/uploads/${name}`, name: file.name };
}
