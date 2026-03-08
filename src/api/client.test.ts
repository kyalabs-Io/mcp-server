import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAgentIdentity, PayClawApiError } from "./client.js";

describe("401 error handling", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    process.env.PAYCLAW_API_URL = "https://www.payclaw.io";
    process.env.PAYCLAW_API_KEY = "pk_live_test_key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.PAYCLAW_API_URL;
    delete process.env.PAYCLAW_API_KEY;
  });

  it("401 response throws PayClawApiError with directed action", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
    });

    await expect(getAgentIdentity(undefined, "test-merchant")).rejects.toThrow(PayClawApiError);
    await expect(getAgentIdentity(undefined, "test-merchant")).rejects.toThrow(/session has expired/i);
    await expect(getAgentIdentity(undefined, "test-merchant")).rejects.toThrow(/payclaw\.io\/dashboard\/keys/i);
    await expect(getAgentIdentity(undefined, "test-merchant")).rejects.toThrow(/PAYCLAW_API_KEY/i);
  });

  it("401 error has statusCode 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
    });

    try {
      await getAgentIdentity(undefined, "test-merchant");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayClawApiError);
      expect((err as PayClawApiError).statusCode).toBe(401);
    }
  });
});
