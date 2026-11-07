# Dữ liệu thử giám sát thi — local

Mở http://127.0.0.1:3001/login. Dùng đăng nhập nhanh, không cần Google hoặc mật khẩu cho các tài khoản giả lập này.

## Tài khoản

| Tài khoản | Mục đích |
| --- | --- |
| `qa.an@acme.vn` | Thí sinh A, thử vi phạm và làm bài bình thường |
| `qa.binh@acme.vn` | Thí sinh B, đối chiếu đồng thời với A |
| `qa.chi@acme.vn` | Thí sinh C, đối chứng hoặc thử thêm |
| `minhanh@acme.vn` | Quản trị viên xem giám sát và nhật ký |

Ba thí sinh thuộc nhóm **QA · Kiểm thử gian lận**, có quyền học và được giao khóa **QA Lab · Thực hành giám sát và chống gian lận**. Khóa có 3 bài viết: bảo mật thông tin, quy tắc thi và cách đọc cờ bất thường. Hạn giao bài ban đầu là 07/12/2026 lúc 14:50 (giờ Việt Nam).

Khóa học: http://127.0.0.1:3001/learn/courses/qa-integrity-course

## Quiz đã sẵn sàng

| Quiz | Câu | Thời gian | Lượt/người | Dùng thử |
| --- | ---: | ---: | ---: | --- |
| [01 · Thử vi phạm và hủy lượt](http://127.0.0.1:3001/learn/quizzes/qa-integrity-quiz-behavior) | 10 | 20 phút | 20 | Rời tab, chuột phải, sao chép, in, nhiều tab |
| [02 · Đồng hồ và tự nộp](http://127.0.0.1:3001/learn/quizzes/qa-integrity-quiz-timer) | 6 | 1 phút | 20 | Để hết giờ, kiểm tra đáp án đã lưu và tự nộp |
| [03 · Nhiều thí sinh](http://127.0.0.1:3001/learn/quizzes/qa-integrity-quiz-compare) | 6 | 10 phút | 20 | Cùng mạng/cùng lúc, nộp nhanh, đáp án giống nhau |

Cả 22 câu đều đã duyệt; bài và quiz đều đã xuất bản. Điểm đạt 80%; chưa mở xem đúng/sai từng câu sau thi. Các câu được soạn riêng cho demo, không gọi API AI và không tạo log AI giả. Mỗi lượt thực tế vẫn xáo câu hỏi và đáp án theo code hiện có. Không cần hoàn thành cả 3 bài học mới được mở quiz.

## Cách thử

1. **Cảnh báo và hủy lượt:** đăng nhập QA An, vào quiz 01. Chuyển tab khác ít nhất 2 giây rồi quay lại, hoặc nhấp chuột phải trong bài. Đóng cảnh báo và chờ hơn 2 giây giữa các lần cùng loại. Ngưỡng khi chuẩn bị dữ liệu là **3 lần được phép**; lần thứ **4** hủy lượt, tính 0 điểm và vẫn mất lượt. Seed không thay đổi ngưỡng chung; nếu Admin đổi cấu hình, áp dụng con số trên màn quiz.
2. **Nhiều tab cùng lượt:** sau khi vào bài, mở tab trống mới và dán nguyên URL `/learn/attempts/...` của lượt đó. Giữ cùng tài khoản. Không dùng thao tác nhân bản tab vì trình duyệt có thể sao chép sessionStorage/token. Mở tab mới là tín hiệu để xem lại, không tự hủy lượt; chuyển tab cũng có thể phát sinh vi phạm rời màn hình riêng.
3. **Tự nộp:** vào quiz 02, trả lời vài câu rồi để hết 1 phút. Kiểm tra trang kết quả và lịch sử lượt làm. Câu bỏ trống tính sai; thời gian không dừng khi rời trang.
4. **Hai người cùng thi:** dùng hai profile hoặc hai phiên trình duyệt riêng cho QA An và QA Bình. Cùng mở quiz 03 trước khi người còn lại nộp. Nếu IP trùng và khoảng thi giao nhau, xuất hiện cờ cùng mạng. Hai tab trong cùng profile chia sẻ cookie, nên không dùng để đăng nhập hai người khác nhau.
5. **Nộp nhanh:** quiz 03 có 6 câu; chọn ít nhất một đáp án và nộp trong dưới 30 giây kể từ bắt đầu. Hệ thống gắn cờ; cờ không tự trừ điểm/hủy bài.
6. **Đáp án giống hệt:** hai tài khoản nộp quiz 03, chọn cùng nội dung cho ít nhất 5 câu và cùng tập câu đã trả lời. Chữ A/B/C/D có thể khác do xáo lựa chọn. Có khóa đáp án theo nội dung trong `.qa/review/integrity-answer-key.json` nếu cần làm hai bài giống nhau. Cờ giống đáp án chỉ là dấu hiệu, kể cả hai người cùng trả lời đúng.

**Xem kết quả:** đăng nhập Admin trong profile/phiên riêng, mở [Giám sát thi đã lọc đúng khóa và nhóm](http://127.0.0.1:3001/admin/results?tab=integrity&course=qa-integrity-course&group=qa-integrity-group). Tải lại sau khi thử; bấm vào một dòng để xem nhật ký, loại sự kiện, thời gian, IP và cờ. Màn này không tự cập nhật theo thời gian thực.

**Giới hạn thử ảnh chụp:** watermark hiển thị tên/mã nhân viên/thời gian. Web không bảo đảm phát hiện mọi công cụ chụp màn hình của hệ điều hành; phím Print Screen và tổ hợp chụp màn hình macOS không tương đương nhau.

## Database và chạy lại

Dữ liệu chỉ nằm trong `.qa/review/preview.db`, được server 127.0.0.1:3001 sử dụng. Có SQLite backup nhất quán trong `.qa/review/backups/` trước khi thêm dữ liệu. `prisma/dev.db` không bị thay đổi.

```sh
node scripts/seed-integrity-demo.mjs
```

Script chỉ bổ sung các bản ghi có ID `qa-integrity-*` còn thiếu. Chạy lại giữ lịch sử lượt làm, các câu đã chỉnh sửa, cấu hình ngưỡng chung và hạn giao bài hiện có; **không reset lượt** hoặc kéo dài hạn tự động. Sau khi dùng hết 20 lượt, Admin có thể tăng số lượt ở cài đặt quiz theo nhu cầu.

Không seed lượt thi, đáp án đã làm, sự kiện vi phạm hoặc cờ giả. Dữ liệu chỉ bắt đầu có lịch sử khi bạn làm bài. Kết quả kiểm chứng tự động được lưu riêng tại `.qa/review/integrity-verification.json`; tài khoản/lượt dùng cho kiểm chứng được xóa riêng sau khi chạy để giữ sạch ba tài khoản thử của bạn.
