"use client";

import { createContext, useContext } from "react";
import type { AppSession } from "@/types/session";
import type { PermissionKey, PermissionGrant } from "@/lib/rbac/permissions";

const SessionContext = createContext<AppSession | null>(null);

export function SessionProvider({ session, children }: { session: AppSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** Throws outside of an authenticated app shell — pages under app/(app) are always wrapped. */
export function useAppSession(): AppSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useAppSession() called outside of <SessionProvider>. Is this page under app/(app)?");
  }
  return session;
}

/** True only for "allowed" — callers that also want to show a "needs approval" affordance should read useGrant() directly. */
export function useHasPermission() {
  const session = useAppSession();
  return (key: PermissionKey) => session.permissions[key] === "allowed";
}

export function useGrant() {
  const session = useAppSession();
  return (key: PermissionKey): PermissionGrant => session.permissions[key];
}
