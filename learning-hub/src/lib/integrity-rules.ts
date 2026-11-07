/**
 * Quiz integrity rules shown to members (quiz intro, quiz screen, warning dialog).
 * Pure constants → safe in client components. Detection lives in TakeQuizClient, counting on the server
 * (src/lib/integrity.ts). DESIGN_SYSTEM.md → Quiz integrity.
 */
import type { ViolationType } from "./integrity";

/** Switching tab / minimising is always deliberate: counted from 0.2 s (filters browser glitches only). */
export const TAB_MIN_MS = 200;
/** Another app or window taking focus: counted from 1 s (a pop-up notification stealing focus is not counted). */
export const BLUR_MIN_MS = 1000;

export const VIOLATION_RULES: { type: ViolationType | "LEFT_PAGE"; label: string }[] = [
  { type: "TAB_HIDDEN", label: "Chuyển sang tab khác hoặc thu nhỏ trình duyệt (dù chỉ trong chốc lát)" },
  { type: "WINDOW_BLUR", label: "Chuyển sang ứng dụng hoặc cửa sổ khác (quá 1 giây)" },
  { type: "LEFT_PAGE", label: "Đóng, tải lại hoặc rời trang bài thi rồi quay lại (quá 3 giây)" },
  { type: "COPY", label: "Sao chép hoặc cắt nội dung (Ctrl/Cmd + C, X)" },
  { type: "CONTEXT_MENU", label: "Bấm chuột phải" },
  { type: "PRINT", label: "In trang (Ctrl/Cmd + P hoặc lệnh in của trình duyệt)" },
  { type: "PRINT_SCREEN", label: "Bấm phím chụp màn hình (Print Screen)" },
  { type: "DEVTOOLS", label: "Mở công cụ nhà phát triển (F12, Ctrl/Cmd + Shift/Option + I, J, C, xem mã nguồn)" },
];

/** How counting works, in the members' words. */
export const COUNTING_RULES = (max: number) => [
  `Mỗi lần vi phạm có một cảnh báo. Bấm "Tôi đã hiểu, làm tiếp" để làm bài tiếp; trong lúc cảnh báo đang mở, hệ thống không tính thêm vi phạm nhưng vẫn ghi lại để quản trị viên xem.`,
  `Vượt quá ${max} lần trong một lượt, lượt đó bị hủy, tính 0 điểm và vẫn mất lượt.`,
  "Bài thi có hình chìm tên và mã nhân viên của bạn. Mỗi lượt có thứ tự câu hỏi và đáp án riêng.",
];
