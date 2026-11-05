Bạn đang làm việc trong file Figma "Learning Hub", nền tảng học nội bộ của Acme Company. Có 2 vai trò Admin và Member, chỉ có bản desktop. File đã có 39 frame, xếp trong các Section từ F0 đến F6. Nhiệm vụ: trong MỘT LẦN chạy, tạo toàn bộ màn hình còn thiếu ở mục D, xếp theo feature. KHÔNG sửa nội dung, không xóa, không di chuyển frame cũ.

# A. Design system: Ant Design

## A1. Thư viện
1. Kiểm tra file đã được thêm kit **"Ant Design System for Figma"** chưa (Assets → Libraries).
   - **Nếu đã có:** dùng instance từ kit cho mọi thành phần có sẵn trong kit, và dùng variants của kit thay vì tự vẽ. Ghi lại phiên bản kit (theo tên hoặc mô tả thư viện) và phiên bản React `antd` tương ứng.
   - **Nếu chưa có hoặc không truy cập được:** ghi rõ ở đầu báo cáo cuối: "Không truy cập được kit Ant Design, component được vẽ lại theo cấu trúc antd." Vẽ lại theo đúng giải phẫu component của antd (kích thước, padding, trạng thái). TUYỆT ĐỐI KHÔNG đặt tên hay mô tả để người khác hiểu nhầm đó là component từ thư viện.
2. Đặt tên layer theo component antd sẽ dùng khi code, để dev map 1-1. Ví dụ: `Layout.Sider`, `Menu`, `Breadcrumb`, `Table`, `Tag`, `Statistic`, `Card`, `Progress`, `Drawer`, `Modal`, `Form.Item`, `Select[mode=multiple]`, `DatePicker[showTime]`, `Alert`, `Result`, `Empty`, `Skeleton`, `Tabs`, `Segmented`, `Descriptions`, `List`, `Popconfirm`, `Tooltip`, `Pagination`, `Input.Search`, `Avatar`, `Dropdown`. Biểu đồ đặt tên `Chart/Bar` hoặc `Chart/StackedBar` (khi code dùng `@ant-design/charts`).
3. Thành phần nào lặp lại từ 2 lần trở lên mà kit không có thì tạo thành component có variants (ví dụ `KPI card` với state default/loading, `Assignment row` với status) và dùng instance của nó.

## A2. Token (tạo trước khi vẽ)
File hiện chưa có variables. Tạo một Variable collection tên **"antd theme"** với 2 mode Light và Dark. Đặt tên biến theo tên token của antd, giá trị Light lấy từ palette của các frame hiện có:

| Token antd | Light |
|---|---|
| colorPrimary | #214E91 |
| colorPrimaryBg | #EAF1FC |
| colorBgLayout | #F8FAFC |
| colorBgContainer | #FFFFFF |
| colorBorder / colorBorderSecondary | #DCE3ED |
| colorText | #17243A |
| colorTextSecondary | #58677D |
| colorTextTertiary | #718096 |
| colorSuccess / colorSuccessBg | #206347 / #EAF5EF |
| colorWarning / colorWarningBg | #83550B / #FFF4DC |
| colorError / colorErrorBg | lấy từ badge "Chưa đạt" trong frame "Admin · Kết quả / Chi tiết lượt làm" |
| fontFamily | Inter |
| fontSize / fontSizeSM / fontSizeLG | 14 / 12 / 16 |
| fontSizeHeading2 (tiêu đề trang) | 28 |
| borderRadius / borderRadiusSM | 8 / 6 |
| padding / paddingSM / paddingLG, margin… | thang 4-8-12-16-24-32 |

- Giá trị Dark lấy từ các frame "· Dark" đang có.
- Gắn (bind) biến vào toàn bộ màu, bo góc và khoảng cách của các frame mới. Không dùng mã màu rời.
- Dùng Auto Layout cho toàn bộ.

## A3. Bố cục chung (giữ đúng như các frame hiện có)
Tham chiếu các frame: "Admin · Danh sách khóa học · VI · Light", "Admin · Kết quả / Chi tiết lượt làm · VI · Light", "Member · Khóa học của tôi · VI · Light".
- **Frame và thanh context:** frame rộng 1440. Trên đầu có thanh "Design context" cao 32: bên trái ghi "ADMIN / <tên màn>" hoặc "MEMBER / <tên màn>", bên phải ghi "TIẾNG VIỆT · LIGHT · 1440".
- **Layout Admin:**
  - `Layout.Sider` 224 gồm: logo "Learning Hub", khối Workspace "Acme Company · 42 người · Nội bộ", `Menu`, và card "Không gian quản trị".
  - Header 80 gồm: `Breadcrumb` "Không gian học tập / …", nút "Tiếng Việt · VI", nút "Sáng", avatar "MA Minh Anh".
  - Menu trong các frame mới: Tổng quan · Khóa học · Giao bài · Người dùng · Nhóm · Danh mục · Kết quả.
- **Layout Member:** header ngang gồm logo, `Menu` ngang "Việc của tôi" và "Khóa học của tôi", nút ngôn ngữ và giao diện, avatar "LA Lan Anh". Nội dung căn giữa, rộng 1200.
- **Frame trạng thái:** bố cục "State collection" (heading, rồi các hàng "Related states", mỗi hàng 2 Panel), giống "Admin · Trạng thái AI & xuất bản quiz".
- **`Tag` trạng thái:** success cho Đạt / Hoàn thành; warning cho Sắp đến hạn / Bản nháp; error cho Quá hạn / Chưa đạt; processing cho Đang học.
- **Ghi chú cuối trang:** chữ nhỏ có icon khiên. Điểm nào chưa chốt ghi bắt đầu bằng "Giả định: …".
- **Tên frame:** "<Admin|Member|Shared> · <Tên màn> · VI · Light".

# B. Trải nghiệm: áp dụng 10 heuristics của Jakob Nielsen
Mỗi màn mới phải thỏa các điểm sau:
1. **Hiển thị trạng thái hệ thống:** có `Skeleton` khi tải; `Spin` kèm chữ khi AI hoặc hệ thống đang xử lý; `Progress` cho tiến độ; `Tag` hạn chót đổi màu theo mức gấp; `message` xác nhận sau khi lưu hoặc giao bài.
2. **Khớp với thế giới thực:** dùng từ nghiệp vụ tiếng Việt (giao bài, hạn chót, đạt / chưa đạt), ngày dd/mm/yyyy, giờ 24h, không dùng mã kỹ thuật.
3. **Người dùng kiểm soát và tự do:** mọi `Drawer` và `Modal` có "Hủy" hoặc "Quay lại"; có thể sửa hoặc xóa giao bài; bộ lọc có "Xóa bộ lọc".
4. **Nhất quán và theo chuẩn:** chỉ dùng component antd; nút chính luôn ở góc phải trên của trang hoặc chân drawer; cùng một trạng thái luôn cùng màu `Tag`.
5. **Phòng tránh lỗi:** `DatePicker` khóa ngày trong quá khứ; nút "Giao bài" bị vô hiệu khi form chưa hợp lệ; hành động xóa dùng `Popconfirm` hoặc `Modal` xác nhận; cảnh báo trước khi giao cho người chưa có quyền truy cập.
6. **Nhận diện thay vì ghi nhớ:** `Select` nhiều lựa chọn hiện chip, có avatar và nhóm; header luôn cho biết đang ở khóa học hoặc quiz nào; có `Breadcrumb`.
7. **Linh hoạt và hiệu quả:** có tìm kiếm và lọc ở mọi bảng; chọn cả nhóm thay vì từng người; số liệu ở dashboard bấm vào được để đi tới danh sách đã lọc sẵn.
8. **Thẩm mỹ và tối giản:** mỗi màn chỉ có 1 nút chính; thao tác phụ để trong menu "…"; không lặp thông tin.
9. **Giúp nhận biết và khắc phục lỗi:** thông báo lỗi nói rõ chuyện gì xảy ra, vì sao, và kèm nút xử lý ("Thử lại", "Dán thủ công", "Đến Quyền truy cập").
10. **Trợ giúp và hướng dẫn:** `Form.Item` có `extra` giải thích ngắn; `Tooltip` định nghĩa từng KPI; empty state nói rõ bước tiếp theo.

# C. Dữ liệu mẫu và phạm vi

## C1. Dữ liệu mẫu
- **Khóa học:**
  - "Bảo mật thông tin" (An toàn thông tin, 4 bài, 2 quiz)
  - "Chào mừng đến Acme" (Hội nhập)
  - "Làm việc nhóm hiệu quả" (Kỹ năng mềm)
  - "Bảo vệ dữ liệu" (An toàn thông tin)
- **Bài học của "Bảo mật thông tin":** Bảo mật bắt đầu từ bạn (bài viết), Nhận diện email lừa đảo (video), Quản lý mật khẩu an toàn (bài viết), Bảo vệ thiết bị làm việc (video).
- **Quiz:**
  - "Kiến thức bảo mật cơ bản": 10 câu, đạt 80%, 15 phút, 3 lượt, mở 05/11/2026 08:00 – 30/11/2026 17:00
  - "Nhận diện rủi ro": 8 câu, đạt 80%, 10 phút, 2 lượt, mở 01/12 – 15/12/2026
- **Nhóm:** Nhân sự, Kinh doanh, Kỹ thuật, Sản phẩm.
- **Thành viên:**
  - Nguyễn Lan Anh (lananh@acme.vn, AC014, Nhân sự)
  - Trần Minh Khoa (AC021, Kinh doanh)
  - Lê Hoàng Nam (AC009, Kỹ thuật)
  - Phạm Thu Hà (AC018, Sản phẩm, đã khóa)
  - Võ Đức Long (AC027, Kỹ thuật)
- **Ngày hiện tại:** 05/11/2026.

## C2. Quy tắc đã chốt
- **Giao bài** luôn là giao **cả khóa học** (gồm mọi bài học và quiz trong khóa). Không giao riêng từng quiz.
- **Người được giao nhưng chưa có quyền truy cập khóa học** đều phải có màn hình thông báo: phía Admin khi giao bài, và phía Member khi mở khóa học được giao.
- **Quiz đã xuất bản** vẫn được sửa **toàn bộ**: thông tin, câu hỏi và cài đặt.
- **Quá hạn:** sau hạn chót, thành viên KHÔNG được học tiếp, cũng không được làm quiz của khóa được giao. Chỉ xem lại được kết quả đã có.
- **Chỉ làm bản desktop 1440**, không có bản mobile.

## C3. Ngoài phạm vi (KHÔNG vẽ)
Bản mobile, thông báo hoặc nhắc nhở, chat hỏi đáp AI về bài học, trợ lý AI cho admin, member tự sửa hồ sơ, upload video, ngân hàng câu hỏi dùng chung, nhiều công ty, xuất file báo cáo. Admin không học bài, không làm quiz.

# D. Màn hình cần tạo (13 frame, theo feature)

Đã có đủ, KHÔNG vẽ lại: F0 Foundations, F1 Đăng nhập, F2 Người dùng · Nhóm · Danh mục, F3 Khóa học & bài học, F6 Học bài · Làm quiz.

## F4 · Quiz & câu hỏi AI (thêm 1 frame vào Section có sẵn)

**F4-1 "Admin · Chi tiết quiz · VI · Light"**, là đích của nút "Xem chi tiết" ở tab Quiz.
- Breadcrumb: Khóa học / Bảo mật thông tin / Kiến thức bảo mật cơ bản.
- Header gồm tên quiz, `Tag` "Đã xuất bản", "Mở 05/11/2026 08:00 – 30/11/2026 17:00". Nút chính "Sửa quiz"; menu "…" chứa "Chuyển về nháp".
- `Descriptions` hoặc 4 `Statistic`: 10 câu hỏi · Điểm đạt 80% · 15 phút · Tối đa 3 lượt.
- `Tabs`:
  - "Câu hỏi · 10" (đang chọn): `List` câu hỏi đã duyệt, mỗi câu có các đáp án, đáp án đúng được đánh dấu, và `Tag` nguồn "AI · Duyệt không sửa" hoặc "AI · Đã sửa". Mỗi câu có nút "Sửa".
  - "Lượt làm · 12"
  - "Bài học nguồn · 2"
- `Card` bên phải "Thống kê nhanh": 12 người đã làm · Tỷ lệ đạt 75% · Điểm trung bình 78%.
- `Alert` info: "Quiz đã xuất bản vẫn sửa được toàn bộ. Thay đổi hiển thị ngay cho thành viên."

## F5 · Kết quả (thêm 1 frame vào Section có sẵn)

**F5-1 "Admin · Kết quả / Tiến độ học · VI · Light"**
- Dưới tiêu đề "Kết quả học tập" có `Tabs`: "Kết quả quiz" và "Tiến độ học bài" (đang chọn).
- Bộ lọc: Khóa học, Nhóm.
- `Table` với các cột: Thành viên / Nhóm, Khóa học, Bài đã học ("3 / 4"), Tiến độ (`Progress`), Lần học gần nhất, Trạng thái (Chưa bắt đầu / Đang học / Đã học hết bài).

## F7 · Giao bài có hạn chót (Release 2)

**F7-1 "Admin · Danh sách giao bài · VI · Light"**
- Tiêu đề "Giao bài", mô tả "Giao khóa học cho thành viên và nhóm, kèm hạn chót." Nút chính "+ Giao bài".
- `Tabs`: Tất cả · Còn hạn · Quá hạn. Có `Input.Search` và bộ lọc Khóa học, Nhóm.
- `Table` với các cột:
  - Khóa học (ảnh cover nhỏ, tên, danh mục)
  - Giao cho (chip, ví dụ "Kinh doanh +2 người")
  - Hạn chót
  - Tiến độ (`Progress` kèm "8 / 12 hoàn thành")
  - Quá hạn (số người, màu error)
  - Thao tác (Xem, Sửa, menu "…")
- 5 dòng dữ liệu, có `Pagination`.

**F7-2 "Admin · Giao bài / Tạo mới · VI · Light"**
`Drawer` rộng 560, mở trên nền F7-1 đã làm mờ.
- Tiêu đề "Giao bài mới".
- `Form` gồm 3 trường:
  - "Khóa học": `Select`, chỉ hiện khóa đã xuất bản. Bên dưới có dòng tóm tắt "4 bài học · 2 quiz".
  - "Giao cho": `Select[mode=multiple]` gồm nhóm và từng người, chọn xong hiện chip.
  - "Hạn chót": `DatePicker[showTime]`, khóa ngày trong quá khứ.
- Chân drawer: "Hủy" và "Giao bài".

**F7-3 "Admin · Giao bài / Thông báo chưa có quyền · VI · Light"**
Hiện sau khi bấm "Giao bài" nếu trong danh sách có người chưa có quyền truy cập khóa học. Dùng `Modal` warning trên nền F7-2.
- Tiêu đề "2 người chưa có quyền truy cập khóa học này".
- `List` tên, nhóm và email của 2 người đó.
- Giải thích: "Họ sẽ thấy khóa học trong Việc của tôi nhưng chưa mở được cho đến khi được cấp quyền."
- Nút "Quay lại chỉnh sửa", nút "Đến Quyền truy cập", và nút chính "Vẫn giao bài".
- Ghi chú: "Giả định: thứ tự và nhãn các nút chờ Product Owner xác nhận."

**F7-4 "Admin · Chi tiết giao bài · VI · Light"**
- Header gồm: tên khóa học, "Hạn chót 12/11/2026 17:00", chip người nhận. Nút "Sửa"; menu "…" chứa "Xóa giao bài".
- 4 `Statistic`: Được giao 12 · Hoàn thành 8 · Đang học 2 · Quá hạn 2.
- `Table` với các cột: Thành viên / Nhóm, Bài đã học (`Progress`), Quiz đã đạt ("1 / 2"), Điểm cao nhất, Trạng thái (Chưa bắt đầu / Đang học / Hoàn thành / Quá hạn / Chưa có quyền), Hoàn thành lúc.
- Không có nút gửi nhắc nhở.
- Ghi chú: "Giả định: Hoàn thành = học hết bài và đạt mọi quiz của khóa."

**F7-5 "Admin · Trạng thái giao bài · VI · Light"** (State collection), gồm các panel:
- `Empty` "Chưa có bài nào được giao" kèm nút "+ Giao bài"
- lỗi validate: thiếu khóa học, thiếu người nhận, hạn chót ở quá khứ
- `Drawer` "Sửa giao bài" đã điền sẵn dữ liệu
- `Modal` xác nhận "Xóa giao bài?"
- `Skeleton` khi đang tải bảng
- `message` "Đã giao bài cho 12 người"

## F8 · Việc của tôi (Release 2)

**F8-1 "Member · Việc của tôi · VI · Light"** ("Việc của tôi" đang active trên menu)
- Tiêu đề "Việc của tôi", mô tả "Khóa học bạn được giao, sắp xếp theo hạn chót."
- 3 `Statistic`: Cần làm 3 · Quá hạn 1 (màu error) · Đã hoàn thành 5.
- Danh sách chia nhóm theo thứ tự: "Quá hạn" → "Sắp đến hạn (7 ngày tới)" → "Còn hạn" → "Đã hoàn thành". Tổng ít nhất 5 card.
- Mỗi card ngang gồm:
  - ảnh cover, tên khóa học, danh mục
  - `Progress` "Đã học 2 / 4 bài"
  - dòng quiz của khóa, mỗi quiz là một chip: tên, điểm cao nhất, Đạt / Chưa đạt / Chưa làm, số lượt còn lại
  - `Tag` hạn chót: error nếu quá hạn, warning nếu còn ≤ 3 ngày
  - nút "Tiếp tục học", "Bắt đầu" hoặc "Xem khóa học"
  - card quá hạn: thay nút học bằng nút "Xem kết quả", kèm dòng "Đã hết hạn lúc 12/11/2026 17:00, không thể học tiếp"

**F8-2 "Member · Khóa học được giao chưa có quyền · VI · Light"**
Màn thông báo phía Member, dùng `Result` status="403".
- Tiêu đề "Bạn chưa có quyền truy cập khóa học được giao".
- Mô tả: "Khóa học 'Bảo vệ dữ liệu' đã được giao cho bạn, hạn chót 12/11/2026, nhưng quản trị viên chưa mở quyền truy cập. Vui lòng liên hệ quản trị viên."
- Nút "Về Việc của tôi".
- Trong F8-1, card tương ứng có `Tag` "Chưa có quyền" và nút bị vô hiệu kèm `Tooltip` giải thích.

**F8-3 "Member · Trạng thái việc được giao · VI · Light"** (State collection), gồm các panel:
- `Empty` "Bạn chưa được giao khóa học nào." kèm link "Xem khóa học của tôi"
- card "Khóa học của tôi" có `Tag` hạn chót ở 3 biến thể: còn hạn, sắp đến hạn, quá hạn
- header "Tổng quan khóa học" có dòng "Hạn chót 12/11/2026 17:00"
- quiz chưa đến giờ mở: "Mở từ 01/12/2026 08:00", nút bị vô hiệu
- "Tổng quan khóa học" khi đã quá hạn: `Alert` error "Khóa học đã quá hạn, bạn không thể học tiếp." Danh sách bài học bị khóa (có icon khóa), chỉ còn xem được kết quả quiz đã làm
- màn giới thiệu quiz khi đã quá hạn: `Alert` error "Đã quá hạn 12/11/2026 17:00, bạn không thể làm quiz này nữa.", nút "Bắt đầu" bị vô hiệu
- card đã hoàn thành: `Tag` "Hoàn thành" kèm ngày hoàn thành

## F9 · Tổng quan (Release 2)

**F9-1 "Admin · Tổng quan · VI · Light"** (trang mặc định của Admin)
- Tiêu đề "Tổng quan", mô tả "Theo dõi tiến độ học, kết quả quiz và chất lượng câu hỏi AI."
- Bộ lọc: Khóa học, Nhóm, `RangePicker` "30 ngày qua".
- 4 `Card` KPI, mỗi thẻ có `Tooltip` định nghĩa và bấm được để đi tới danh sách đã lọc:
  1. "Tỷ lệ hoàn thành bài học" 68%, kèm "124 / 182 bài"
  2. "Tỷ lệ đạt quiz" 74%, kèm "37 / 50 lượt"
  3. "Thành viên có khóa học quá hạn" 6 (màu error)
  4. "Câu hỏi AI duyệt không cần sửa" 62%
- `Chart/Bar` "Tỷ lệ hoàn thành theo nhóm" cho 4 nhóm.
- `Chart/StackedBar` "Chất lượng câu hỏi AI": Duyệt không sửa 62% · Đã sửa 28% · Từ chối 10%, kèm chú thích.
- `Table` "Thành viên có khóa học quá hạn" với các cột: Thành viên / Nhóm, Khóa học, Hạn chót, Quá hạn ("3 ngày"), Tiến độ. Link "Xem tất cả" dẫn tới tab Quá hạn của Giao bài.
- `Table` "Tỷ lệ đạt theo quiz" với các cột: Quiz, Khóa học, Lượt làm, Tỷ lệ đạt.

**F9-2 "Admin · Trạng thái tổng quan · VI · Light"** (State collection), gồm các panel:
- `Skeleton` cho KPI và biểu đồ
- `Empty` "Chưa có hoạt động học trong khoảng thời gian này"
- bộ lọc không có kết quả, kèm "Xóa bộ lọc"
- `Alert` lỗi tải dữ liệu, kèm nút "Thử lại"

## F10 · Transcript tự động (Release 2)

**F10-1 "Admin · Transcript tự động · VI · Light"** (State collection cho khối Transcript trong trình biên tập video), gồm các panel:
- nút "Lấy transcript tự động"
- đang lấy: `Spin` kèm "Đang lấy transcript…"
- thành công: `Alert` success, transcript được điền sẵn và vẫn sửa được
- thất bại: `Alert` error "Không lấy được transcript cho video này.", kèm 2 nút "Thử lại" và "Dán thủ công"
- Ghi chú: "Giả định: cách lấy transcript tự động đang chờ xác nhận (HLD-Q7)."

## F11 · Lỗi chung

**F11-1 "Shared · Mất quyền truy cập / Không tìm thấy · VI · Light"**
Dùng header Member. Hai `Result` đặt cạnh nhau:
- 403: "Bạn không còn quyền truy cập khóa học này", dùng khi bị gỡ quyền hoặc khóa học chuyển về Bản nháp. Nút "Về Khóa học của tôi".
- 404: "Không tìm thấy trang". Nút "Về trang chủ".

## Biến thể (làm sau cùng, nếu còn khả năng)
Chuyển mode của collection "antd theme" để tạo:
- "Admin · Tổng quan · VI · Dark" và "Member · Việc của tôi · VI · Dark"
- "Admin · Dashboard · EN · Light" và "Member · My learning · EN · Light" (thanh context ghi "ENGLISH · LIGHT · 1440")

# E. Vị trí trên canvas
- **F4-1:** đặt BÊN TRONG Section "F4 · Quiz & câu hỏi AI", tại ô trống ở tọa độ tuyệt đối x = 4080, y = 12868.
- **F5-1:** đặt BÊN TRONG Section "F5 · Kết quả", tại ô trống ở tọa độ tuyệt đối x = 960, y = 15661.
- **Section mới:** tạo cho F7, F8, F9, F10, F11 và Biến thể, đặt tên như tiêu đề ở mục D (ví dụ "F7 · Giao bài có hạn chót (Release 2)").
  - Xếp dọc. Section đầu tiên ở x = -720, y = 23236. Các Section cách nhau 400.
  - Quy cách giống các Section cũ: rộng 7920, lề trái/phải 120, lề trên 200, lề dưới 120; frame xếp ngang tối đa 5 frame mỗi hàng, cách nhau 120.

# F. Báo cáo khi xong
1. Kit Ant Design có truy cập được không. Nếu có thì ghi phiên bản kit và phiên bản `antd` tương ứng; nếu không thì ghi "chưa xác định".
2. Danh sách frame đã tạo, theo từng feature.
3. Với mỗi frame: các component lấy từ kit, và các component vẽ lại (kèm tên antd tương ứng).
4. Các điểm "Giả định" còn lại.
