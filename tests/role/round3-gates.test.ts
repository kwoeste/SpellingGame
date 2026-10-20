import { describe, expect, it } from "vitest";
import { decideRequest } from "@/lib/auth/decide";

describe("round 3 gates", () => {
  it("sends signed-out visitors on /my-progress to sign-in", () => {
    expect(decideRequest({ pathname: "/my-progress", hasSession: false, role: null }).kind).toBe("redirect-signin");
    expect(decideRequest({ pathname: "/my-progress", hasSession: true, role: "student" }).kind).not.toBe("forbidden");
  });

  it("keeps inventory admin-only", () => {
    expect(decideRequest({ pathname: "/admin/inventory", hasSession: true, role: "student" }).kind).toBe("forbidden");
    expect(decideRequest({ pathname: "/admin/inventory", hasSession: false, role: null }).kind).toBe("forbidden");
    expect(decideRequest({ pathname: "/api/admin/inventory", hasSession: true, role: "student" }).kind).toBe("forbidden");
    expect(decideRequest({ pathname: "/api/admin/inventory", hasSession: false, role: null }).kind).toBe("unauthorized");
    expect(decideRequest({ pathname: "/api/admin/inventory", hasSession: true, role: "admin" }).kind).toBe("allow");
  });
});
