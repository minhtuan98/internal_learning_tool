import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.unmock("@/lib/auth");
import { signInWithEmail, getCurrentUser, createSession, requireAdmin, requireMember, devLoginEnabled } from "@/lib/auth";
import { afterSignInPath, homeFor } from "@/lib/welcome";

describe("F1 · Đăng nhập và phân quyền · DEC-011/012/028/029", () => {
  it("từ chối email ngoài allowlist", async () => { expect(await signInWithEmail("unknown@example.test")).toEqual({ ok: false, reason: "NOT_ALLOWED" }); expect(mocks.cookies.set).not.toHaveBeenCalled(); });
  it("từ chối tài khoản khóa", async () => { mocks.db.user.findUnique.mockResolvedValue({ status: "LOCKED" }); expect(await signInWithEmail("locked@example.test")).toEqual({ ok: false, reason: "LOCKED" }); expect(mocks.db.user.update).not.toHaveBeenCalled(); });
  it("chuẩn hóa email trước khi tra allowlist", async () => { await signInWithEmail("  USER@Example.test  "); expect(mocks.db.user.findUnique).toHaveBeenCalledWith({ where: { email: "user@example.test" } }); });
  it("đăng nhập tạo cookie HttpOnly và giữ tên đã lưu", async () => { vi.stubEnv("SESSION_SECRET", "test-secret-that-is-at-least-32-characters"); vi.stubEnv("APP_URL", "https://example.test"); mocks.db.user.findUnique.mockResolvedValue({ id: "u1", role: "MEMBER", status: "ACTIVE", fullName: "Existing", avatarUrl: null }); expect(await signInWithEmail("u@example.test", { name: "Google Name", picture: "avatar" })).toEqual({ ok: true, role: "MEMBER" }); expect(mocks.cookies.set).toHaveBeenCalledWith("lh_session", expect.any(String), expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" })); expect(mocks.db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fullName: "Existing", avatarUrl: "avatar" }) })); });
  it("không tạo session với secret yếu", async () => { vi.stubEnv("SESSION_SECRET", "short"); await expect(createSession("u1")).rejects.toThrow("32 characters"); });
  it("không có cookie trả null", async () => expect(await getCurrentUser()).toBeNull());
  it("JWT bị sửa trả null", async () => { mocks.cookies.get.mockReturnValue({ value: "forged.jwt.token" }); expect(await getCurrentUser()).toBeNull(); });
  it("member không vào admin", async () => { vi.stubEnv("SESSION_SECRET", "test-secret-that-is-at-least-32-characters"); await createSession("u1"); const token = mocks.cookies.set.mock.calls[0][1]; mocks.cookies.get.mockReturnValue({ value: token }); mocks.db.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", role: "MEMBER" }); await expect(requireAdmin()).rejects.toThrow("REDIRECT:/learn"); });
  it("admin không vào luồng học", async () => { vi.stubEnv("SESSION_SECRET", "test-secret-that-is-at-least-32-characters"); await createSession("u1"); mocks.cookies.get.mockReturnValue({ value: mocks.cookies.set.mock.calls[0][1] }); mocks.db.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", role: "ADMIN" }); await expect(requireMember()).rejects.toThrow("REDIRECT:/admin"); });
  it("dev login chỉ mở khi cấu hình true", () => { vi.stubEnv("AUTH_DEV_LOGIN", "false"); expect(devLoginEnabled()).toBe(false); vi.stubEnv("AUTH_DEV_LOGIN", "true"); expect(devLoginEnabled()).toBe(true); });
});

describe("F1 · Màn hình chào mừng", () => {
  it.each([["ADMIN", "/admin/dashboard"], ["MEMBER", "/learn"]])("trang chủ của %s", (role, path) => expect(homeFor(role)).toBe(path));
  it("mặc định hiện welcome", async () => expect(await afterSignInPath("MEMBER")).toBe("/welcome"));
  it("ghi nhớ lựa chọn bỏ qua welcome", async () => { mocks.cookies.get.mockReturnValue({ value: "1" }); expect(await afterSignInPath("ADMIN")).toBe("/admin/dashboard"); });
});
