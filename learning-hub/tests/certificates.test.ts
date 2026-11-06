import { describe, it, expect, vi } from "vitest";
import { mocks } from "./setup";
vi.mock("@/lib/access", () => ({ progressForCourses: vi.fn() }));
import { progressForCourses, type CourseProgress } from "@/lib/access";
import { CERT_DEFAULTS, certificateNumber, getCertificateSettings, issueCertificates } from "@/lib/certificates";
import { updateCertificateSettings } from "@/server/certificate-actions";

describe("F10 · Chứng chỉ", () => {
  it("đúng định dạng số chứng chỉ", () => expect(certificateNumber(22, "IMS", 2026)).toBe("22/GCN-IMS.2026"));
  it("cài đặt chưa có dùng mặc định", async () => expect(await getCertificateSettings()).toEqual(CERT_DEFAULTS));
  it("cài đặt đã lưu ghi đè mặc định", async () => { mocks.db.setting.findMany.mockResolvedValue([{ key: "cert.signerName", value: "Signer" }]); expect((await getCertificateSettings()).signerName).toBe("Signer"); });
  it("khóa rỗng không phát hành", async () => expect(await issueCertificates("u1", [])).toBe(0));
  it("không phát hành cho admin", async () => { mocks.db.user.findUnique.mockResolvedValue({ id: "admin", role: "ADMIN" }); expect(await issueCertificates("admin", ["c1"])).toBe(0); });
  it("không cấp trùng chứng chỉ đã có", async () => { mocks.db.user.findUnique.mockResolvedValue({ id: "u1", role: "MEMBER" }); mocks.db.certificate.findMany.mockResolvedValue([{ courseId: "c1" }]); expect(await issueCertificates("u1", ["c1"])).toBe(0); expect(mocks.db.certificate.create).not.toHaveBeenCalled(); });
  it("chỉ phát hành khi hoàn thành và chụp lại tên người/khóa", async () => {
    const completedAt = new Date("2026-11-06T06:00:00Z");
    mocks.db.user.findUnique.mockResolvedValue({ id: "u1", role: "MEMBER", fullName: "Learner", email: "u@example.test" });
    vi.mocked(progressForCourses).mockResolvedValue(new Map([["c1", { complete: true, completedAt } as CourseProgress]]));
    mocks.db.course.findMany.mockResolvedValue([{ id: "c1", title: "Security" }]);
    expect(await issueCertificates("u1", ["c1"])).toBe(1);
    expect(mocks.db.certificate.create).toHaveBeenCalledWith({ data: expect.objectContaining({ number: "1/GCN-IMS.2026", recipientName: "Learner", courseTitle: "Security", completedAt, signerName: CERT_DEFAULTS.signerName }) });
  });
  it("cập nhật chuẩn hóa mã và lưu đầy đủ cài đặt", async () => { expect((await updateCertificateSettings({ ...CERT_DEFAULTS, sealCode: " ims " })).ok).toBe(true); expect(mocks.db.setting.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { key: "cert.sealCode", value: "IMS" } })); });
  it.each([{ signerName: "" }, { sealCode: "bad/code" }, { sealCode: "TOO-LONG-CODE" }, { signerName: "A".repeat(61) }])("từ chối cài đặt chứng chỉ không hợp lệ %#", async (change) => expect((await updateCertificateSettings({ ...CERT_DEFAULTS, ...change })).ok).toBe(false));
});
