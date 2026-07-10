export default function OfflineFallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-6 text-center">
      <span className="material-symbols-rounded text-5xl text-muted-foreground">wifi_off</span>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page hasn&apos;t been cached yet. Pages you&apos;ve already visited still work offline. Field data captured
        offline is saved locally and will sync automatically once you&apos;re back online.
      </p>
    </div>
  );
}
