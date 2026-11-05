import { getCurrentUser } from "@/lib/auth";
import { CONTENT_TYPES, readUpload } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { name } = await params;
  const data = await readUpload(name);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop()!;
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
