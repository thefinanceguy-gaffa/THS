import { NextResponse } from "next/server";
import { runProspectCollection } from "@/lib/prospecting/collect";

/**
 * Vercel Cron target (see vercel.json) — weekly, not per-request, per
 * README.md's AI Prospecting section ("run nightly/weekly... this is a
 * research job, not a chat response"). Vercel signs cron requests with
 * this bearer token automatically; reject anything else so the endpoint
 * can't be triggered by an outsider hammering a public URL.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runProspectCollection();
  return NextResponse.json(summary);
}
