import { sseResponse } from "@/server/realtime/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return sseResponse();
}
