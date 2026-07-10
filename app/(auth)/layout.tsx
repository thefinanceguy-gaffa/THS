import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Image src="/icons/icon-96x96.png" alt="THS OS" width={36} height={36} className="rounded-lg" />
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold tracking-tight">The Hygiene Squad</span>
          <span className="font-mono text-[9.5px] tracking-[1.5px] text-muted-foreground uppercase">THS Operating System</span>
        </div>
      </div>
      <div className="w-full max-w-sm space-y-4">{children}</div>
    </div>
  );
}
