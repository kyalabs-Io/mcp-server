import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAgentIdentity, PayClawApiError } from "./client.js";

describe("401 error handling", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    process.env.PAYCLAW_API_URL = "https://www.payclaw.io";
    process.env.PAYCLAW_API_KEY = "pk_live_test_key";
    mockFetch.mockResolvedValue({ ok: false, status: 401, headers: new Headers() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.PAYCLAW_API_URL;
    delete process.env.PAYCLAW_API_KEY;
  });

  it("throws PayClawApiError with directed action on 401", async () => {
    let caught: unknown;
    try {
      await getAgentIdentity(undefined, "test-merchant");
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PayClawApiError);
    const err = caught as PayClawApiError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/PayClaw authentication failed/i);
    expect(err.message).toMatch(/payclaw\.io\/dashboard\/keys/i);
    expect(err.message).toMatch(/PAYCLAW_API_KEY/i);
  });
});
