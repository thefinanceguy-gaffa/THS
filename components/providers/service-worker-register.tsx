"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // A waiting worker means a new deploy landed while this tab was open.
      // Surface it instead of silently deferring the update until the user
      // happens to close every tab (the standard SW update lifecycle).
      function notifyIfWaiting() {
        if (registration.waiting && navigator.serviceWorker.controller) {
          toast("A new version of THS OS is available", {
            action: {
              label: "Refresh",
              onClick: () => registration.waiting?.postMessage({ type: "SKIP_WAITING" }),
            },
            duration: Infinity,
          });
        }
      }
      notifyIfWaiting();
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed") notifyIfWaiting();
        });
      });
    });

    // Once the new worker takes control, reload so the tab actually runs the
    // new app shell rather than leaving stale JS running against a fresh SW.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  return null;
}
