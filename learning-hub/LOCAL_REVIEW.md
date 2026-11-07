# Bản duyệt local — 07/11/2026

Chạy bản duyệt tại http://127.0.0.1:3001. Đăng nhập nhanh với `minhanh@acme.vn` (Admin) hoặc `lananh@acme.vn` (Member). Server chỉ bind loopback và sử dụng `.qa/review/preview.db`; database gốc `prisma/dev.db` không đổi. Chưa deploy ứng dụng hay publish báo cáo.

## Những lỗi đã sửa

- Server lưu giao bài tự kiểm tra khóa đã xuất bản và có người nhận thực tế; không thể bỏ qua bằng cách gọi thẳng thao tác lưu.
- Bài học chỉ được sửa qua đúng khóa sở hữu, tránh ghi nhầm dữ liệu và refresh nhầm trang.
- Từ chối ngày mở/đóng quiz sai định dạng, trạng thái khóa học/quiz/câu hỏi/tài khoản ngoài danh sách hợp lệ và số lượng tạo câu hỏi NaN.
- Video phải dùng HTTP(S), hostname chính xác và ID hợp lệ; chặn link rỗng, protocol không hợp lệ và chèn đường dẫn/query vào ID.
- Lần thi lại sau khi đã đạt không thay ngày hoàn thành đầu tiên; ngày hoạt động cuối vẫn cập nhật.
- Không đổi nội dung/đáp án hoặc duyệt thêm/bớt câu hỏi khi có người đang thi. Chấm các lượt đã hết hạn theo bộ đáp án cũ trước khi cho sửa.
- Các lần autosave đáp án chạy theo thứ tự. Nộp bài chờ lưu xong; lỗi lưu chặn nộp tay và hiển thị yêu cầu chọn lại. Nếu nộp tự động lỗi, có nút thử nộp lại.
- Tách scope CSS variables cho sáng/tối để nút, dropdown và số liệu chuyển đúng palette ngay khi đổi theme, không cần tải lại trang.
- Bỏ ép trang rộng 1280px. Sidebar desktop, menu mobile, grid KPI và thẻ học tập thích ứng; bảng dài cuộn trong vùng riêng.
- Sửa dropdown nằm ngoài màn hình khi bật giảm chuyển động: quy tắc CSS cũ áp transition 0,01ms cho mọi phần tử, làm sai phép đo vị trí tạm của popup. Giảm transition về đúng 0s và dùng token motion của Ant Design theo lựa chọn hệ điều hành.

## Giao diện để duyệt

Giữ thương hiệu Saigon Technology và màu teal, bổ sung sidebar có icon, thanh tài khoản gọn, vùng tổng quan có hành động chính, khoảng cách và bề mặt đồng nhất. Giảm glow trên các panel, giữ sáng/tối, điều hướng bàn phím và liên kết bỏ qua điều hướng. Trang thành viên có tổng quan tiến độ, khóa được giao và các nút học/chứng chỉ.

Ảnh và log thực tế ở `.qa/review/`. Các file `after-dashboard-dark.png`, `after-dashboard-light.png`, `after-dashboard-mobile.png`, `after-member-desktop.png`, `after-member-mobile.png` được tạo khi bộ browser QA đi qua từng bước; `browser-results.json` ghi rõ bước nào pass/fail.

## Bằng chứng kiểm thử

- Ban đầu: 241 unit test pass; QA.md mô tả ba lỗi cũ là chưa sửa nhưng code đã sửa. Tài liệu đó đã được cập nhật.
- Trước khi sửa vòng này: 14 trong 15 regression test mới thất bại. Log: `.qa/review/before-regressions.log`.
- Sau sửa: 260 unit test pass; coverage logic là 81,71% dòng và 69,46% nhánh. Báo cáo unit hiện ở `qa-dashboard/report.json`; chỉ là unit test, không gộp kết quả browser/integration.
- 5 bài kiểm tra tích hợp pass với SQLite và Prisma thật: nội dung đã sanitize, quyền nhóm, lưu bài/quiz/đáp án, chấm điểm, chứng chỉ và chấm lượt hết hạn trước khi đổi đáp án. Chỉ mock phiên đăng nhập và ranh giới request/cache của Next.
- `npm run test:proof` cố ý làm hỏng bản sao parser video và xác nhận test gốc thất bại đúng ca hostname giả với exit code 1. Không sửa code chính; đây là một phép thử có chủ đích, không phải full mutation score.
- Browser QA cuối: **10/10 kịch bản pass**, không có lỗi runtime/HTTP 500 được ghi nhận. `npm run test:browser`: Chrome thật, đăng nhập/session thật, kiểm tra phân quyền, các trang quản trị/thành viên, bộ lọc, lưu theme, màn hình 390px, và thi quiz với độ trễ HTTP 500ms. Kết quả cuối cùng được đối chiếu bằng truy vấn SQLite, không chỉ đọc chữ “thành công” trên UI. Xem trạng thái thực tế trong `.qa/review/browser-results.json`.
- `npm run build` đã pass, bao gồm kiểm tra TypeScript. Các script tái chạy được mô tả trong `QA.md`.

Source SHA256 đã kiểm tra: `1ffe9ee878016781696077375a4494c86b1a61cf277dd7f6fd990124e18afade`.

## Port

Đã dừng các server Learning Hub trùng ở 3001/3002 và demo-night ở 3005. Bản duyệt mới dùng duy nhất 127.0.0.1:3001. Port 3000 thuộc dự án `NguoiQue` được giữ nguyên; các port macOS, VS Code và OneDrive cũng được giữ.

## Phần chưa xác minh hoặc còn tồn tại

- **Notion chưa kết nối.** Chưa đọc lại PRD gốc `Internal Learning Platform — Product Docs`. Các DEC đang đối chiếu theo README/comment, chưa thể khẳng định toàn hệ thống đúng với tài liệu Notion. Cần kết nối Notion để hoàn tất phần đối chiếu yêu cầu.
- Google OAuth thực tế và API Anthropic chưa được gọi trong vòng kiểm tra này. Transcript tự động vẫn là phần chưa triển khai được ghi sẵn trong README; không giả lập nó là đã hoạt động.
- `npm audit` ghi nhận **31 cảnh báo dependency (4 high, 27 moderate)**, bao gồm chuỗi Prisma/deepmerge-ts, PostCSS và Tiptap. Chưa thực hiện nâng major Prisma/Tiptap/Next trong vòng sửa logic và duyệt UI này. Không coi hệ thống là đã sạch cảnh báo bảo mật. Snapshot chi tiết: `.qa/review/dependency-audit.json`.
- Unit coverage chỉ đo các file logic được cấu hình trong Vitest. Không bao hàm mọi route, tích hợp bên ngoài, race condition hoặc mọi cách sử dụng UI.

Đây là bản sửa và bản duyệt có bằng chứng cho các ca đã kiểm tra; không phải cam kết toàn hệ thống không còn bug.
