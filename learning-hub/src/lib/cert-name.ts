/**
 * Recipient name on certificates (pure → safe in client components for previews).
 * FULL  = full name as stored, with Vietnamese marks   → "Đặng Quốc Bảo"
 * ASCII = full name without marks                      → "Dang Quoc Bao"
 * EMAIL = account name (part before @), as on the paper certificates → "ngoc.tran2"
 * A member without a full name falls back to the account name.
 */
export type NameFormat = "FULL" | "ASCII" | "EMAIL";

export const NAME_FORMATS: { value: NameFormat; label: string }[] = [
  { value: "FULL", label: "Họ tên có dấu (Đặng Quốc Bảo)" },
  { value: "ASCII", label: "Họ tên không dấu (Dang Quoc Bao)" },
  { value: "EMAIL", label: "Tên tài khoản email (dang.bao)" },
];

export const stripMarks = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

/** Collapses spaces and capitalises each word ("đặng  quốc bảo" → "Đặng Quốc Bảo"). */
const tidy = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("vi") + w.slice(1).toLocaleLowerCase("vi"))
    .join(" ");

export function formatRecipientName(u: { fullName?: string | null; email: string }, format: NameFormat) {
  const account = u.email.split("@")[0];
  const full = u.fullName?.trim();
  if (format === "EMAIL" || !full) return account;
  return format === "ASCII" ? tidy(stripMarks(full)) : tidy(full);
}
