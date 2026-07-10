"use client";

import { db, type JobEventOutboxRow } from "./db";
import { createClient } from "@/lib/supabase/client";

let syncing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function onOutboxChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function enqueueJobEvent(row: Omit<JobEventOutboxRow, "id" | "status">) {
  await db.jobEventOutbox.add({ ...row, status: "pending" });
  notify();
  void flush();
}

export async function pendingCount(): Promise<number> {
  return db.jobEventOutbox.where("status").anyOf(["pending", "failed"]).count();
}

/**
 * Replays the outbox against record_job_event() (idempotent on
 * client_generated_id). Bails immediately if already running so a retried
 * 30s-interval tick and the browser's 'online' event never race each other.
 */
export async function flush() {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  syncing = true;
  try {
    const rows = await db.jobEventOutbox.where("status").anyOf(["pending", "failed"]).sortBy("createdAt");
    const supabase = createClient();
    for (const row of rows) {
      const { error } = await supabase.rpc("record_job_event", {
        p_job_id: row.jobId,
        p_type: row.type,
        p_payload: row.payload,
        p_gps_lat: row.gpsLat,
        p_gps_lng: row.gpsLng,
        p_client_generated_id: row.clientGeneratedId,
      });
      if (error) {
        await db.jobEventOutbox.update(row.id!, { status: "failed", error: error.message });
      } else {
        await db.jobEventOutbox.delete(row.id!);
      }
    }
  } finally {
    syncing = false;
    notify();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  setInterval(() => void flush(), 30_000);
}
