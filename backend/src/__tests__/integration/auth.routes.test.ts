// src/__tests__/integration/auth.routes.test.ts
// Integration tests for /v1/auth/* routes using supertest + mocked Prisma.

import request from "supertest";
import { createApp } from "../../app";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";

const app = createApp();

// The auth controller uses COOKIE_NAME = "refreshToken"
const REFRESH_COOKIE = "refreshToken";

// ─────────────────────────────────────────────────────────────────────────────

describe("Auth Routes (Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Safe defaults
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: "rt-1" });
    (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
  });

  // ── POST /v1/auth/register ──────────────────────────────────────────────────

  describe("POST /v1/auth/register", () => {
    it("201 with user object and accessToken", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        plan: "FREE",
        bizName: "Test Biz",
        name: null,
        logoUrl: null,
        currency: "USD",
        aiTone: "professional",
        readReceipts: true,
        createdAt: new Date(),
      });

      const res = await request(app).post("/v1/auth/register").send({
        email: "test@example.com",
        password: "StrongPassword1!",
        businessName: "Test Biz",
      });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
      // passwordHash must never be returned
      expect(res.body.user.password).toBeUndefined();
    });

    it("409 on duplicate email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });

      const res = await request(app).post("/v1/auth/register").send({
        email: "test@example.com",
        password: "StrongPassword1!",
        businessName: "Test Biz",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("400/422 on weak password (fails Zod validation)", async () => {
      const res = await request(app).post("/v1/auth/register").send({
        email: "test@example.com",
        password: "weak", // too short, no uppercase/number required
        businessName: "Test Biz",
      });

      // registerSchema uses .parse() which throws ZodError → caught as 422 by errorHandler
      expect([400, 422]).toContain(res.status);
    });
  });

  // ── POST /v1/auth/login ─────────────────────────────────────────────────────

  describe("POST /v1/auth/login", () => {
    it("200 with accessToken and sets refreshToken cookie", async () => {
      const hashedPassword = await bcrypt.hash("StrongPassword1!", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: hashedPassword,
        plan: "FREE",
        name: null,
        bizName: null,
        logoUrl: null,
        currency: "USD",
        aiTone: "professional",
        readReceipts: true,
        createdAt: new Date(),
      });

      const res = await request(app).post("/v1/auth/login").send({
        email: "test@example.com",
        password: "StrongPassword1!",
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      // Cookie should be set — the header value can be string or array
      const rawCookie = res.headers["set-cookie"] as string | string[] | undefined;
      const cookies = rawCookie
        ? (Array.isArray(rawCookie) ? rawCookie : [rawCookie])
        : [];
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: string) => c.startsWith(`${REFRESH_COOKIE}=`))).toBe(true);
    });

    it("401 on wrong password", async () => {
      const hashedPassword = await bcrypt.hash("StrongPassword1!", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: hashedPassword,
        plan: "FREE",
      });

      const res = await request(app).post("/v1/auth/login").send({
        email: "test@example.com",
        password: "WrongPassword",
      });

      expect(res.status).toBe(401);
    });

    it("401 on unknown email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).post("/v1/auth/login").send({
        email: "unknown@example.com",
        password: "Password1!",
      });

      expect(res.status).toBe(401);
    });
  });

  // ── POST /v1/auth/refresh ───────────────────────────────────────────────────

  describe("POST /v1/auth/refresh", () => {
    it("200 with a new accessToken", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: "rt-1",
        expiresAt: new Date(Date.now() + 100_000),
        user: { id: "user-1", email: "test@example.com", plan: "FREE" },
      });

      // Send cookie with the correct name the controller reads
      const res = await request(app)
        .post("/v1/auth/refresh")
        .set("Cookie", [`${REFRESH_COOKIE}=fake-raw-token`]);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it("401 with no cookie present", async () => {
      const res = await request(app).post("/v1/auth/refresh");
      expect(res.status).toBe(401);
    });

    it("401 with a revoked token", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/v1/auth/refresh")
        .set("Cookie", [`${REFRESH_COOKIE}=revoked-token`]);

      expect(res.status).toBe(401);
    });
  });

  // ── POST /v1/auth/logout ────────────────────────────────────────────────────

  describe("POST /v1/auth/logout", () => {
    it("200 and clears the refreshToken cookie", async () => {
      const res = await request(app)
        .post("/v1/auth/logout")
        .set("Cookie", [`${REFRESH_COOKIE}=fake-raw-token`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();

      // The server should send a cleared cookie (Max-Age=0 or empty value)
      const rawCookie = res.headers["set-cookie"] as string | string[] | undefined;
      if (rawCookie) {
        const cookies = Array.isArray(rawCookie) ? rawCookie : [rawCookie];
        // Express clearCookie sets the cookie=; with various expiry/maxage attributes
        const refreshCookie = cookies.find((c: string) => c.startsWith(`${REFRESH_COOKIE}=`));
        expect(refreshCookie).toBeDefined();
      }
    });
  });
});
