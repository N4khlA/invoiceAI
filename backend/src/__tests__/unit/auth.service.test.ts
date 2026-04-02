// src/__tests__/unit/auth.service.test.ts
// Unit tests for auth.service — all external deps (Prisma, Resend, bcrypt) are mocked in setup.ts.

import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from "../../services/auth.service";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";

// ── Helpers ────────────────────────────────────────────────────────────────────

const baseUser = {
  id: "user-1",
  email: "test@example.com",
  plan: "FREE",
  name: null,
  bizName: "Test Biz",
  bizAddress: null,
  bizPhone: null,
  bizWebsite: null,
  logoUrl: null,
  currency: "USD",
  aiTone: "professional",
  readReceipts: true,
  password: "hashed",
  createdAt: new Date(),
};

// ─────────────────────────────────────────────────────────────────────────────

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: refreshToken operations succeed silently
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: "rt-1" });
  });

  // ── register() ──────────────────────────────────────────────────────────────

  describe("register()", () => {
    it("creates user and returns tokens", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(baseUser);

      const result = await register({
        email: "test@example.com",
        password: "Password1!",
        businessName: "Test Biz",
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.rawRefresh).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
      // password must not be exposed
      expect((result.user as Record<string, unknown>).password).toBeUndefined();
      expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it("throws 409 if email already exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });

      const promise = register({
        email: "test@example.com",
        password: "Password1!",
        businessName: "biz",
      });

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({ statusCode: 409 });
    });

    it("hashes password (never stores plaintext)", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(baseUser);

      const hashSpy = jest.spyOn(bcrypt, "hash");

      await register({
        email: "test@example.com",
        password: "Password1!",
        businessName: "Test Biz",
      });

      expect(hashSpy).toHaveBeenCalledWith("Password1!", 12);
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.password).not.toBe("Password1!");
    });
  });

  // ── login() ─────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("returns tokens on valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("StrongPassword1!", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });

      const result = await login({
        email: "test@example.com",
        password: "StrongPassword1!",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.rawRefresh).toBeDefined();
      expect(result.user.id).toBe("user-1");
    });

    it("throws 401 on wrong password", async () => {
      const hashedPassword = await bcrypt.hash("StrongPassword1!", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...baseUser,
        password: hashedPassword,
      });

      await expect(
        login({ email: "test@example.com", password: "WrongPassword" })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("throws 401 on unknown email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        login({ email: "unknown@example.com", password: "Password1!" })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("timing safe (calls bcrypt.compare even when user not found)", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const compareSpy = jest.spyOn(bcrypt, "compare");

      await expect(
        login({ email: "unknown@example.com", password: "pwd" })
      ).rejects.toThrow();

      // bcrypt.compare must be called even when the user doesn't exist
      expect(compareSpy).toHaveBeenCalled();
    });
  });

  // ── refresh() ───────────────────────────────────────────────────────────────

  describe("refresh()", () => {
    it("rotates tokens on valid refresh token", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: "rt-1",
        expiresAt: new Date(Date.now() + 100_000),
        user: { id: "user-1", email: "test@example.com", plan: "FREE" },
      });

      const result = await refresh("raw-token");

      // Old tokens deleted for this user, new one created
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.rawRefresh).toBeDefined();
    });

    it("throws 401 on revoked (not found) token", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(refresh("invalid-token")).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("throws 401 on expired token", async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: "rt-1",
        expiresAt: new Date(Date.now() - 100_000), // past
        user: baseUser,
      });
      // delete the expired token
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await expect(refresh("expired-token")).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ── logout() ────────────────────────────────────────────────────────────────

  describe("logout()", () => {
    it("revokes the refresh token", async () => {
      await logout("some-token");
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it("idempotent — no error if token not found", async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      await expect(logout("non-existent")).resolves.not.toThrow();
    });
  });

  // ── forgotPassword() ────────────────────────────────────────────────────────

  describe("forgotPassword()", () => {
    it("always returns the same message regardless of email existence", async () => {
      // Case 1: user exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        ...baseUser,
      });
      const withUser = await forgotPassword("test@example.com");

      // Case 2: user does NOT exist
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const withoutUser = await forgotPassword("unknown@example.com");

      expect(withUser).toEqual(withoutUser);
    });

    it("sends email only when user exists", async () => {
      // Access the persistent spy attached to the Resend constructor mock.
      // This survives jest.clearAllMocks() because it is a plain property,
      // not part of .mock.instances (which clearAllMocks resets).
      const { Resend: ResendMock } = jest.requireMock<{
        Resend: jest.Mock & { __sendMock: jest.Mock };
      }>("resend");
      const sendSpy = ResendMock.__sendMock;

      // User exists → email should be sent
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...baseUser });
      await forgotPassword("test@example.com");
      expect(sendSpy).toHaveBeenCalledTimes(1);

      sendSpy.mockClear(); // reset only the send spy for the next assertion

      // User does NOT exist → no email
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await forgotPassword("unknown@example.com");
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("does NOT reveal if email exists in response (enumeration-safe)", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await forgotPassword("unknown@example.com");
      expect(res.message).toBe("If that email exists you will receive a link.");
    });
  });

  // ── resetPassword() ─────────────────────────────────────────────────────────

  describe("resetPassword()", () => {
    it("updates password and revokes all refresh tokens via transaction", async () => {
      // Sign a valid reset token
      const token = jwt.sign(
        { sub: "user-1", email: "test@example.com", purpose: "password-reset" },
        env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser });
      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      await resetPassword({ token, newPassword: "NewPassword1!" });

      expect(prisma.$transaction).toHaveBeenCalled();
      // Transaction receives an array of two Prisma operations
      const transactionArg = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      expect(Array.isArray(transactionArg)).toBe(true);
      expect(transactionArg).toHaveLength(2);
    });

    it("throws 400 on invalid/expired token", async () => {
      await expect(
        resetPassword({ token: "invalid.jwt.token", newPassword: "Irrelevant1!" })
      ).rejects.toMatchObject({ statusCode: 422 }); // AppError.validation → 422
    });
  });
});
