import { describe, expect, it } from "vitest";
import { changeKey, chunkText, normalizeDate, normalizeVersion, productKey, renewalDueDate, renewalStatus } from "@/backend/kb-rules";

describe("knowledge base rules", () => {
  it("treats product names case- and space-insensitively", () => {
    expect(productKey("  Acme   Router ")).toBe(productKey("acme router"));
  });
  it("treats v1.2 and 1.2 as the same version", () => {
    expect(normalizeVersion("v1.2")).toBe("1.2");
  });
  it("deduplicates identical changes for the same product and version", () => {
    expect(changeKey("p1", "v2.0", "Added  SSO")).toBe(changeKey("p1", "2.0", "added sso"));
    expect(changeKey("p1", "2.0", "Added SSO")).not.toBe(changeKey("p1", "2.1", "Added SSO"));
  });
  it("rejects invalid dates", () => {
    expect(normalizeDate("2026-02-30")).toBeNull();
    expect(normalizeDate("2026-02-03")).toBe("2026-02-03");
  });
  it("splits long text into overlapping chunks", () => {
    const chunks = chunkText("a".repeat(4000), 1800, 200);
    expect(chunks.length).toBe(3);
  });
  it("content is due for renewal one month after it was renewed", () => {
    expect(renewalDueDate("2026-09-15T10:00:00Z").toISOString()).toBe("2026-10-15T10:00:00.000Z");
    expect(renewalDueDate("2026-01-31T00:00:00Z").toISOString().slice(0, 10)).toBe("2026-02-28");
  });
  it("flags content as overdue once the month has passed", () => {
    expect(renewalStatus("2026-09-15T10:00:00Z", new Date("2026-10-16T00:00:00Z")).state).toBe("overdue");
    expect(renewalStatus("2026-09-15T10:00:00Z", new Date("2026-10-10T00:00:00Z")).state).toBe("soon");
    expect(renewalStatus("2026-09-15T10:00:00Z", new Date("2026-09-20T00:00:00Z")).state).toBe("ok");
  });
});
