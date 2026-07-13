import { describe, it, expect } from "vitest";
import { normalizeCompanyName, isDuplicateCompany } from "./dedupe";

describe("normalizeCompanyName", () => {
  it("strips common legal suffixes and punctuation", () => {
    expect(normalizeCompanyName("Old Mutual (Pvt) Ltd")).toBe("old mutual");
    expect(normalizeCompanyName("CBZ Bank Limited")).toBe("cbz bank");
  });

  it("lowercases and collapses whitespace", () => {
    expect(normalizeCompanyName("  Simbisa   Brands  ")).toBe("simbisa brands");
  });
});

describe("isDuplicateCompany", () => {
  it("flags a match ignoring suffix/case differences", () => {
    expect(isDuplicateCompany("old mutual zimbabwe pvt ltd", ["Old Mutual Zimbabwe"])).toBe(true);
  });

  it("does not flag distinct companies", () => {
    expect(isDuplicateCompany("Acme Cleaning", ["Old Mutual Zimbabwe", "CBZ Bank"])).toBe(false);
  });

  it("returns false for an empty candidate", () => {
    expect(isDuplicateCompany("", ["Old Mutual"])).toBe(false);
  });
});
