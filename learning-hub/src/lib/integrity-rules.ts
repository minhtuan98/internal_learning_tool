/**
 * Quiz integrity rules shown to members (quiz intro, quiz screen, warning dialog).
 * Pure constants → safe in client components. Detection lives in TakeQuizClient, counting on the server
 * (src/lib/integrity.ts). DESIGN_SYSTEM.md → Quiz integrity.
 */
import type { ViolationType } from "./integrity";

/** Shorter absences (a notification stealing focus for a moment) are not counted. */
export const AWAY_MS = 1500;

export const VIOLATION_RULES: { type: ViolationType; label: string }[] = [
  { type: "TAB_HIDDEN", label: "Chuyển sang tab khác hoặc thu nhỏ trình duyệt (quá 1,5 giây)" },
  { type: "WINDOW_BLUR", label: "Chuyển sang ứng dụng hoặc cửa sổ khác (quá 1,5 giây)" },
  { type: "COPY", label: "Sao chép hoặc cắt nội dung (Ctrl/Cmd + C, X)" },
  { type: "CONTEXT_MENU", label: "Bấm chuột phải" },
  { type: "PRINT", label: "In trang (Ctrl/Cmd + P hoặc lệnh in của trình duyệt)" },
  { type: "PRINT_SCREEN", label: "Bấm phím chụp màn hình (Print Screen)" },
];

/** How counting works, in the members' words. */
export const COUNTING_RULES = (max: number) => [
  `Mỗi lần vi phạm có một cảnh báo. Bấm "Tôi đã hiểu, làm tiếp" để làm bài tiếp; trong lúc cảnh báo đang mở, hệ thống không tính thêm vi phạm.`,
  `Vượt quá ${max} lần trong một lượt, lượt đó bị hủy, tính 0 điểm và vẫn mất lượt.`,
  "Bài thi có hình chìm tên và mã nhân viên của bạn. Mỗi lượt có thứ tự câu hỏi và đáp án riêng.",
];
