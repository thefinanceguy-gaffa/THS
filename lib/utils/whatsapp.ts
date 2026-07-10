/** Normalizes a Zimbabwe-or-international phone number and builds a wa.me deep link. Returns null if there's no usable number. */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("0")) digits = `+263${digits.slice(1)}`;
  if (!digits.startsWith("+")) digits = `+${digits}`;
  const e164 = digits.replace(/\D/g, "");
  if (e164.length < 9) return null;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
