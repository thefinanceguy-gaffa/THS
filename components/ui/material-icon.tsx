import { cn } from "@/lib/utils";

/**
 * The app's content/nav icon set (DESIGN_TOKENS.md: "Icons only from
 * Material Symbols Rounded — no custom SVG icon set"). `name` is any
 * Material Symbols ligature name, e.g. "dashboard", "group", "receipt_long".
 * shadcn/ui primitives keep their own tiny structural lucide icons
 * (chevrons, close buttons) — those aren't part of this visual system.
 */
export function MaterialIcon({
  name,
  filled = false,
  className,
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden="true" data-filled={filled} className={cn("material-symbols-rounded", className)}>
      {name}
    </span>
  );
}
