import Dexie, { type EntityTable } from "dexie";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Field-capture offline queue for the Supervisor App (README.md:
 * "Must work offline — service worker + IndexedDB queue"). Scoped to just
 * job_events for now — the one write path that has to survive a
 * Zimbabwe office/site with no signal. Each row replays through
 * record_job_event(), which is idempotent on clientGeneratedId, so a
 * retried sync after a dropped response never double-applies.
 */
export interface JobEventOutboxRow {
  id?: number;
  jobId: string;
  type: string;
  payload: Json | null;
  gpsLat: number | null;
  gpsLng: number | null;
  clientGeneratedId: string;
  createdAt: string;
  status: "pending" | "failed";
  error?: string;
}

const db = new Dexie("ths-os-offline") as Dexie & {
  jobEventOutbox: EntityTable<JobEventOutboxRow, "id">;
};

db.version(1).stores({
  jobEventOutbox: "++id, jobId, status, createdAt",
});

export { db };
