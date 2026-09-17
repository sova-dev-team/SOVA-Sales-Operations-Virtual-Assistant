import { afterEach, describe, expect, it, vi } from "vitest";

import { clearTokens, hasStoredSession } from "./client";
import { sovaApi } from "./sovaApi";

describe("sovaApi authentication", () => {
  afterEach(() => {
    clearTokens();
    vi.unstubAllGlobals();
  });

  it("stores a validated token pair after login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            tokenType: "bearer",
            expiresIn: 1800,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await sovaApi.login({
      email: "staff.demo@example.test",
      password: "DemoPass123!",
    });

    expect(hasStoredSession()).toBe(true);
  });

  it("surfaces the API error without creating a session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ detail: "Email or password is incorrect." }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      sovaApi.login({
        email: "staff.demo@example.test",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(hasStoredSession()).toBe(false);
  });
});
