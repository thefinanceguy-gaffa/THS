import { Button, type buttonVariants } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { buildWhatsAppLink } from "@/lib/utils/whatsapp";
import type { VariantProps } from "class-variance-authority";

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  size = "sm",
  variant = "outline",
}: {
  phone: string | null | undefined;
  message: string;
  label?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  const href = buildWhatsAppLink(phone, message);
  if (!href) return null;

  return (
    <Button variant={variant} size={size} render={<a href={href} target="_blank" rel="noopener noreferrer" />}>
      <MaterialIcon name="chat" className="text-[16px]" />
      {label}
    </Button>
  );
}
