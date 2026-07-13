/** Strips common Zimbabwean/English company-suffix noise so "Old Mutual (Pvt) Ltd" and "Old Mutual" compare equal. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(pvt\)|\(pty\)|\bpvt\b|\bpty\b|\bltd\b|\blimited\b|\bincorporated\b|\binc\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True if `candidate` normalizes to the same string as any of `existingNames`. */
export function isDuplicateCompany(candidate: string, existingNames: string[]): boolean {
  const normalized = normalizeCompanyName(candidate);
  if (!normalized) return false;
  return existingNames.some((existing) => normalizeCompanyName(existing) === normalized);
}
