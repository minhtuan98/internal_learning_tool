/* Sample data matching the Figma designs (Acme Company). Run: npm run db:reset */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const now = Date.now();
const at = (days: number, hour?: number) => {
  const d = new Date(now + days * DAY);
  if (hour !== undefined) d.setHours(hour, 0, 0, 0);
  return d;
};

function cover(name: string, from: string, to: string, label: string) {
  const dir = path.join(process.cwd(), "data", "uploads");
  mkdirSync(dir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="800" height="450" fill="url(#g)"/>
<circle cx="660" cy="90" r="140" fill="#ffffff" fill-opacity="0.08"/><circle cx="120" cy="420" r="180" fill="#ffffff" fill-opacity="0.06"/>
<text x="56" y="380" font-family="Inter, Segoe UI, Arial" font-size="44" font-weight="700" fill="#ffffff">${label}</text>
<text x="56" y="80" font-family="Inter, Segoe UI, Arial" font-size="22" fill="#ffffff" fill-opacity="0.8">ACME · LEARNING HUB</text></svg>`;
  writeFileSync(path.join(dir, name), svg);
  return name;
}

const p = (...xs: string[]) => xs.map((x) => `<p>${x}</p>`).join("");

const ARTICLE_1 =
  "<h2>Vì sao bảo mật bắt đầu từ mỗi người</h2>" +
  p(
    "Phần lớn sự cố bảo mật tại các công ty bắt nguồn từ thao tác của con người, không phải từ lỗ hổng kỹ thuật.",
    "Mỗi nhân viên là một lớp phòng thủ: một cú nhấp chuột vào đường link lạ có thể mở đường cho kẻ tấn công vào toàn bộ hệ thống.",
    "Thông tin của khách hàng và đối tác là tài sản công ty được giao cho bạn bảo vệ, vì vậy hãy chỉ truy cập dữ liệu cần cho công việc.",
  ) +
  "<h3>Ba thói quen cần có</h3><ul><li>Khóa màn hình máy tính mỗi khi rời khỏi chỗ ngồi.</li><li>Không dùng chung tài khoản công ty với bất kỳ ai, kể cả đồng nghiệp.</li><li>Báo ngay cho bộ phận IT khi nghi ngờ có sự cố, kể cả khi bạn đã tự khắc phục.</li></ul>" +
  p("Báo cáo sớm giúp đội IT khoanh vùng sự cố nhanh hơn và giảm thiệt hại cho cả công ty.");

const ARTICLE_2 =
  "<h2>Mật khẩu mạnh là gì</h2>" +
  p(
    "Mật khẩu mạnh nên dài ít nhất 12 ký tự và kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.",
    "Cách dễ nhớ nhất là dùng cụm từ ghép từ bốn đến năm từ không liên quan, ví dụ một câu ngắn chỉ bạn hiểu.",
    "Mỗi hệ thống cần một mật khẩu riêng; dùng lại mật khẩu khiến một vụ lộ dữ liệu ở trang khác ảnh hưởng tới tài khoản công ty.",
  ) +
  "<h3>Trình quản lý mật khẩu và xác thực hai lớp</h3>" +
  p(
    "Công ty cung cấp trình quản lý mật khẩu để bạn lưu và tạo mật khẩu ngẫu nhiên cho từng hệ thống.",
    "Luôn bật xác thực hai lớp cho email và các hệ thống nội bộ, ưu tiên ứng dụng xác thực thay vì tin nhắn SMS.",
    "Không bao giờ cung cấp mật khẩu hoặc mã xác thực qua điện thoại hay email, kể cả khi người hỏi tự xưng là bộ phận IT.",
  );

const TRANSCRIPT =
  "Xin chào, trong video này chúng ta sẽ học cách nhận diện email lừa đảo. " +
  "Dấu hiệu đầu tiên là địa chỉ người gửi gần giống tên miền công ty nhưng sai một vài ký tự. " +
  "Dấu hiệu thứ hai là nội dung tạo cảm giác gấp gáp, ví dụ yêu cầu chuyển tiền ngay hoặc tài khoản sắp bị khóa. " +
  "Dấu hiệu thứ ba là đường link hoặc tệp đính kèm không mong đợi, đặc biệt là tệp nén hoặc tệp có macro. " +
  "Trước khi nhấp vào link, hãy rê chuột lên để xem địa chỉ thật của đường link. " +
  "Nếu nghi ngờ, đừng trả lời email đó mà hãy liên hệ người gửi qua một kênh khác mà bạn đã biết. " +
  "Cuối cùng, hãy dùng nút báo cáo lừa đảo trong hộp thư để đội IT kiểm tra và chặn email tương tự cho cả công ty.";

const WELCOME_1 =
  "<h2>Chào mừng bạn đến với Acme</h2>" +
  p(
    "Acme được thành lập với mong muốn mang công nghệ đơn giản, đáng tin cậy đến các doanh nghiệp vừa và nhỏ.",
    "Ba giá trị cốt lõi của chúng tôi là khách hàng trước tiên, minh bạch trong mọi việc và học hỏi mỗi ngày.",
    "Mỗi quý, công ty tổ chức buổi chia sẻ để mọi người cùng nhìn lại mục tiêu và kết quả của từng nhóm.",
  );
const WELCOME_2 =
  "<h2>Cách chúng ta làm việc cùng nhau</h2>" +
  p(
    "Các cuộc họp nội bộ luôn có chương trình gửi trước và biên bản gửi lại trong vòng một ngày làm việc.",
    "Tài liệu dự án được lưu tập trung trên Google Drive của công ty, không lưu trên thiết bị cá nhân.",
    "Khi cần hỗ trợ, hãy hỏi trực tiếp trưởng nhóm hoặc đặt câu hỏi trong kênh chung của phòng ban.",
  );
const DATA_1 =
  "<h2>Phân loại dữ liệu</h2>" +
  p(
    "Dữ liệu tại Acme được chia thành bốn mức: công khai, nội bộ, bảo mật và tuyệt mật.",
    "Dữ liệu khách hàng như hợp đồng, thông tin liên hệ và lịch sử giao dịch luôn thuộc mức bảo mật trở lên.",
    "Dữ liệu tuyệt mật chỉ được chia sẻ cho người có tên trong danh sách được phê duyệt.",
  );
const DATA_2 =
  "<h2>Chia sẻ dữ liệu an toàn</h2>" +
  p(
    "Khi chia sẻ tệp trên Google Drive, chỉ cấp quyền cho từng người cụ thể thay vì bất kỳ ai có đường liên kết.",
    "Không gửi dữ liệu bảo mật qua ứng dụng nhắn tin cá nhân hoặc email cá nhân.",
    "Khi kết thúc dự án, hãy thu hồi quyền truy cập của người ngoài công ty đối với các tệp đã chia sẻ.",
  );

type Q = [string, string[], number, string];
const QUIZ_1: Q[] = [
  ["Phần lớn sự cố bảo mật tại công ty bắt nguồn từ đâu?", ["Lỗ hổng phần mềm chưa vá", "Thao tác của con người", "Thiên tai làm hỏng máy chủ", "Mất điện đột ngột"], 1, "Bài “Bảo mật bắt đầu từ bạn” nêu phần lớn sự cố bắt nguồn từ thao tác của con người."],
  ["Bạn nên làm gì mỗi khi rời khỏi chỗ ngồi?", ["Tắt màn hình", "Khóa màn hình máy tính", "Đăng xuất email", "Không cần làm gì nếu rời đi dưới 5 phút"], 1, "Khóa màn hình là một trong ba thói quen cần có."],
  ["Đồng nghiệp xin mượn tài khoản công ty của bạn để làm gấp một việc. Bạn nên:", ["Cho mượn vì là đồng nghiệp", "Cho mượn rồi đổi mật khẩu sau", "Từ chối và hướng dẫn họ xin quyền phù hợp", "Gửi mật khẩu qua tin nhắn riêng"], 2, "Không dùng chung tài khoản công ty với bất kỳ ai."],
  ["Bạn đã tự khắc phục một sự cố nghi ngờ bảo mật. Bước tiếp theo đúng là:", ["Không cần báo vì đã xử lý xong", "Vẫn báo ngay cho bộ phận IT", "Chỉ báo nếu sự cố lặp lại", "Báo trong buổi họp quý"], 1, "Báo sớm giúp đội IT khoanh vùng sự cố, kể cả khi bạn đã tự khắc phục."],
  ["Mật khẩu mạnh nên dài tối thiểu bao nhiêu ký tự?", ["6", "8", "10", "12"], 3, "Bài “Quản lý mật khẩu an toàn” khuyến nghị ít nhất 12 ký tự."],
  ["Vì sao không nên dùng lại một mật khẩu cho nhiều hệ thống?", ["Vì khó nhớ hơn", "Vì một vụ lộ dữ liệu ở trang khác có thể ảnh hưởng tài khoản công ty", "Vì hệ thống sẽ tự khóa", "Vì vi phạm bản quyền"], 1, "Dùng lại mật khẩu khiến lộ dữ liệu ở nơi khác ảnh hưởng tài khoản công ty."],
  ["Hình thức xác thực hai lớp nào được ưu tiên?", ["Tin nhắn SMS", "Ứng dụng xác thực", "Câu hỏi bảo mật", "Gửi mã qua email cá nhân"], 1, "Ưu tiên ứng dụng xác thực thay vì SMS."],
  ["Một người gọi điện tự xưng bộ phận IT và xin mã xác thực của bạn. Bạn nên:", ["Đọc mã vì IT cần hỗ trợ", "Từ chối cung cấp mã", "Gửi mã qua email", "Hỏi tên rồi cung cấp mã"], 1, "Không bao giờ cung cấp mật khẩu hoặc mã xác thực qua điện thoại hay email."],
  ["Dấu hiệu nào cho thấy một email có thể là lừa đảo?", ["Email có chữ ký đầy đủ", "Địa chỉ người gửi gần giống tên miền công ty nhưng sai vài ký tự", "Email gửi trong giờ hành chính", "Email có lời chào lịch sự"], 1, "Video “Nhận diện email lừa đảo” nêu dấu hiệu tên miền gần giống."],
  ["Khi nghi ngờ một email lừa đảo, cách xử lý đúng là:", ["Trả lời email để hỏi lại", "Nhấp link để kiểm tra", "Dùng nút báo cáo lừa đảo và liên hệ người gửi qua kênh khác", "Chuyển tiếp cho cả phòng để cảnh báo"], 2, "Dùng nút báo cáo lừa đảo và xác minh qua kênh khác."],
];
const QUIZ_2: Q[] = [
  ["Nội dung email tạo cảm giác gấp gáp thường nhằm mục đích gì?", ["Giúp bạn làm việc nhanh hơn", "Khiến bạn hành động trước khi kịp suy nghĩ", "Thông báo lịch họp", "Tăng tính chuyên nghiệp"], 1, "Tạo cảm giác gấp gáp là dấu hiệu thứ hai của email lừa đảo."],
  ["Trước khi nhấp vào một đường link trong email, bạn nên:", ["Nhấp ngay để xem nội dung", "Rê chuột lên link để xem địa chỉ thật", "Sao chép link gửi đồng nghiệp", "Mở bằng điện thoại cá nhân"], 1, "Rê chuột lên link để xem địa chỉ thật."],
  ["Loại tệp đính kèm nào cần đặc biệt cảnh giác?", ["Ảnh JPG từ đồng nghiệp", "Tệp nén hoặc tệp có macro không mong đợi", "Lịch họp", "Chữ ký email"], 1, "Tệp nén hoặc có macro là dấu hiệu thứ ba."],
  ["Thông tin khách hàng là:", ["Tài sản riêng của người phụ trách", "Tài sản công ty được giao cho bạn bảo vệ", "Dữ liệu công khai", "Dữ liệu có thể chia sẻ tự do trong công ty"], 1, "Thông tin khách hàng là tài sản công ty được giao cho bạn bảo vệ."],
  ["Công cụ nào công ty cung cấp để tạo mật khẩu ngẫu nhiên?", ["Sổ tay giấy", "Trình quản lý mật khẩu", "Bảng tính Excel", "Ghi chú điện thoại"], 1, "Công ty cung cấp trình quản lý mật khẩu."],
  ["Câu nào sau đây là đúng về bảo mật?", ["Chỉ IT chịu trách nhiệm bảo mật", "Mỗi nhân viên là một lớp phòng thủ", "Bảo mật chỉ cần phần mềm diệt virus", "Đổi mật khẩu mỗi ngày là đủ"], 1, "Mỗi nhân viên là một lớp phòng thủ."],
];
const QUIZ_DATA: Q[] = [
  ["Dữ liệu tại Acme được chia thành mấy mức?", ["2", "3", "4", "5"], 2, "Bốn mức: công khai, nội bộ, bảo mật, tuyệt mật."],
  ["Hợp đồng khách hàng thuộc mức dữ liệu nào?", ["Công khai", "Nội bộ", "Bảo mật trở lên", "Không cần phân loại"], 2, "Dữ liệu khách hàng luôn thuộc mức bảo mật trở lên."],
  ["Khi chia sẻ tệp trên Google Drive, cách an toàn là:", ["Bất kỳ ai có đường liên kết", "Cấp quyền cho từng người cụ thể", "Công khai trên web", "Gửi qua email cá nhân"], 1, "Chỉ cấp quyền cho từng người cụ thể."],
];

async function main() {
  await prisma.$transaction([
    prisma.aiCallLog.deleteMany(),
    prisma.answer.deleteMany(),
    prisma.attempt.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.assignmentTarget.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.question.deleteMany(),
    prisma.quizSourceLesson.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.courseAccess.deleteMany(),
    prisma.course.deleteMany(),
    prisma.user.deleteMany(),
    prisma.group.deleteMany(),
    prisma.category.deleteMany(),
  ]);

  const [hr, sales, eng, product] = await Promise.all(
    ["Nhân sự", "Kinh doanh", "Kỹ thuật", "Sản phẩm"].map((name) => prisma.group.create({ data: { name } })),
  );
  const [catSec, catOnb, catSoft] = await Promise.all(
    ["An toàn thông tin", "Hội nhập", "Kỹ năng mềm"].map((name) => prisma.category.create({ data: { name } })),
  );

  const mk = (email: string, fullName: string | null, role: string, code: string, title: string, groupId: string | null, extra: object = {}) =>
    prisma.user.create({ data: { email, fullName, role, employeeCode: code, jobTitle: title, groupId, lastSignInAt: fullName ? at(-1, 9) : null, ...extra } });

  await mk("minhanh@acme.vn", "Nguyễn Minh Anh", "ADMIN", "AC001", "Trưởng phòng Đào tạo", null);
  await mk("quanghuy@acme.vn", "Trần Quang Huy", "ADMIN", "AC002", "Chuyên viên Đào tạo", null);
  const first = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase();
  if (first) await mk(first, null, "ADMIN", "AC000", "Quản trị viên hệ thống", null);
  const lanAnh = await mk("lananh@acme.vn", "Nguyễn Lan Anh", "MEMBER", "AC014", "Chuyên viên nhân sự", hr.id);
  const khoa = await mk("khoa@acme.vn", "Trần Minh Khoa", "MEMBER", "AC021", "Nhân viên kinh doanh", sales.id);
  const nam = await mk("nam@acme.vn", "Lê Hoàng Nam", "MEMBER", "AC009", "Kỹ sư phần mềm", eng.id);
  await mk("ha@acme.vn", "Phạm Thu Hà", "MEMBER", "AC018", "Thiết kế sản phẩm", product.id, { status: "LOCKED" });
  const long = await mk("long@acme.vn", "Võ Đức Long", "MEMBER", "AC027", "Kỹ sư kiểm thử", eng.id);
  const bao = await mk("bao@acme.vn", "Đặng Quốc Bảo", "MEMBER", "AC031", "Trưởng nhóm kinh doanh", sales.id);
  await mk("linh@acme.vn", null, "MEMBER", "AC042", "Phân tích nghiệp vụ", product.id);

  const sec = await prisma.course.create({
    data: { title: "Bảo mật thông tin", description: "Xây dựng thói quen bảo vệ thông tin công ty mỗi ngày.", coverImage: cover("seed-security.svg", "#214E91", "#3B6FBF", "Bảo mật thông tin"), categoryId: catSec.id, status: "PUBLISHED", updatedBy: "Nguyễn Minh Anh" },
  });
  const welcome = await prisma.course.create({
    data: { title: "Chào mừng đến Acme", description: "Tìm hiểu con người, văn hóa và cách chúng ta làm việc.", coverImage: cover("seed-welcome.svg", "#206347", "#3E8E6A", "Chào mừng đến Acme"), categoryId: catOnb.id, status: "PUBLISHED", updatedBy: "Nguyễn Minh Anh" },
  });
  await prisma.course.create({
    data: { title: "Làm việc nhóm hiệu quả", description: "Giao tiếp, phân công và phản hồi trong nhóm.", coverImage: cover("seed-team.svg", "#83550B", "#C08A2E", "Làm việc nhóm hiệu quả"), categoryId: catSoft.id, status: "DRAFT", updatedBy: "Trần Quang Huy" },
  });
  const data = await prisma.course.create({
    data: { title: "Bảo vệ dữ liệu", description: "Phân loại và chia sẻ dữ liệu đúng cách.", coverImage: cover("seed-data.svg", "#4B3F8F", "#7364C2", "Bảo vệ dữ liệu"), categoryId: catSec.id, status: "PUBLISHED", updatedBy: "Nguyễn Minh Anh" },
  });

  const L = (courseId: string, position: number, title: string, type: string, extra: object) => prisma.lesson.create({ data: { courseId, position, title, type, ...extra } });
  const s1 = await L(sec.id, 1, "Bảo mật bắt đầu từ bạn", "ARTICLE", { articleBody: ARTICLE_1, durationMinutes: 6 });
  const s2 = await L(sec.id, 2, "Nhận diện email lừa đảo", "VIDEO", { videoUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE", transcript: TRANSCRIPT, durationMinutes: 8 });
  const s3 = await L(sec.id, 3, "Quản lý mật khẩu an toàn", "ARTICLE", { articleBody: ARTICLE_2, durationMinutes: 5 });
  const s4 = await L(sec.id, 4, "Bảo vệ thiết bị làm việc", "VIDEO", { videoUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE", durationMinutes: 6 });
  const w1 = await L(welcome.id, 1, "Văn hóa Acme", "ARTICLE", { articleBody: WELCOME_1, durationMinutes: 4 });
  const w2 = await L(welcome.id, 2, "Cách chúng ta làm việc", "ARTICLE", { articleBody: WELCOME_2, durationMinutes: 4 });
  const d1 = await L(data.id, 1, "Phân loại dữ liệu", "ARTICLE", { articleBody: DATA_1, durationMinutes: 5 });
  const d2 = await L(data.id, 2, "Chia sẻ dữ liệu an toàn", "ARTICLE", { articleBody: DATA_2, durationMinutes: 5 });

  const log = await prisma.aiCallLog.create({ data: { model: "seed", promptVersion: "qgen-v1", status: "OK", durationMs: 0, questionCount: 19 } });
  async function quiz(courseId: string, title: string, status: string, sources: string[], qs: Q[], review: (i: number) => { reviewStatus: string; edited: boolean }, extra: object = {}) {
    const q = await prisma.quiz.create({ data: { courseId, title, status, publishedAt: status === "PUBLISHED" ? at(-10) : null, sources: { create: sources.map((lessonId) => ({ lessonId })) }, ...extra } });
    await prisma.question.createMany({
      data: qs.map(([text, options, correctIndex, explanation], i) => ({ quizId: q.id, position: i + 1, text, options: JSON.stringify(options), correctIndex, explanation, aiCallId: log.id, createdAt: at(-10), ...review(i) })),
    });
    return prisma.quiz.findUniqueOrThrow({ where: { id: q.id }, include: { questions: { orderBy: { position: "asc" } } } });
  }
  const q1 = await quiz(sec.id, "Kiến thức bảo mật cơ bản", "PUBLISHED", [s1.id, s2.id, s3.id], QUIZ_1, (i) => ({ reviewStatus: "APPROVED", edited: [2, 5, 7].includes(i) }), { passScore: 80, timeLimitMinutes: 15, maxAttempts: 3, opensAt: at(-14, 8), closesAt: at(25, 17) });
  await quiz(sec.id, "Nhận diện rủi ro", "DRAFT", [s1.id, s2.id], QUIZ_2, (i) => (i === 5 ? { reviewStatus: "REJECTED", edited: false } : i === 0 ? { reviewStatus: "APPROVED", edited: true } : { reviewStatus: "PENDING", edited: false }), { passScore: 80, timeLimitMinutes: 10, maxAttempts: 2, opensAt: at(26, 8), closesAt: at(40, 17) });
  await quiz(data.id, "Phân loại dữ liệu", "PUBLISHED", [d1.id, d2.id], QUIZ_DATA, () => ({ reviewStatus: "APPROVED", edited: false }), { passScore: 70, timeLimitMinutes: 5, maxAttempts: 2 });

  // Course access: by group and individually (DEC-021, DEC-022).
  await prisma.courseAccess.createMany({
    data: [
      ...[hr, sales, eng, product].map((g) => ({ courseId: sec.id, groupId: g.id })),
      ...[hr, sales, eng, product].map((g) => ({ courseId: welcome.id, groupId: g.id })),
      { courseId: data.id, groupId: hr.id },
    ],
  });

  // Learning progress.
  const done = (userId: string, lessonIds: string[], daysAgo: number) =>
    prisma.lessonProgress.createMany({ data: lessonIds.map((lessonId, i) => ({ userId, lessonId, completedAt: at(-daysAgo - (lessonIds.length - i) * 0.1) })) });
  await done(lanAnh.id, [s1.id, s2.id], 1);
  await done(lanAnh.id, [w1.id, w2.id], 4);
  await done(khoa.id, [s1.id], 6);
  await done(nam.id, [s1.id, s2.id, s3.id, s4.id], 5);
  await done(nam.id, [w1.id], 3);
  await done(bao.id, [s1.id, s2.id, s3.id], 7);

  // Submitted attempts with answers so results and dashboards have data.
  async function attempt(userId: string, number: number, correct: number, daysAgo: number, minutes: number) {
    const startedAt = at(-daysAgo);
    const submittedAt = new Date(startedAt.getTime() + minutes * 60_000);
    const score = Math.round((correct / q1.questions.length) * 100);
    await prisma.attempt.create({
      data: {
        quizId: q1.id,
        userId,
        number,
        status: "SUBMITTED",
        startedAt,
        deadlineAt: new Date(startedAt.getTime() + q1.timeLimitMinutes * 60_000),
        submittedAt,
        score,
        passed: score >= q1.passScore,
        correctCount: correct,
        totalCount: q1.questions.length,
        answers: { create: q1.questions.map((q, i) => ({ questionId: q.id, selectedIndex: i < correct ? q.correctIndex : (q.correctIndex + 1) % 4, isCorrect: i < correct })) },
      },
    });
  }
  await attempt(lanAnh.id, 1, 6, 1.3, 11);
  await attempt(lanAnh.id, 2, 9, 0.2, 9);
  await attempt(khoa.id, 1, 6, 5, 12);
  await attempt(nam.id, 1, 8, 4, 10);
  await attempt(bao.id, 1, 7, 6, 13);

  // Assignments (Release 2): whole courses with deadlines (DEC-055).
  const assign = (courseId: string, deadline: Date, targets: { userId?: string; groupId?: string }[]) =>
    prisma.assignment.create({ data: { courseId, deadline, targets: { create: targets } } });
  await assign(sec.id, at(-3, 17), [{ groupId: sales.id }, { userId: long.id }]); // overdue for Kinh doanh + Đức Long
  await assign(sec.id, at(2, 17), [{ groupId: hr.id }]); // due soon for Nhân sự
  await assign(welcome.id, at(7, 17), [hr, sales, eng, product].map((g) => ({ groupId: g.id })));
  await assign(data.id, at(10, 17), [{ userId: lanAnh.id }, { userId: long.id }]); // Đức Long has no access (DEC-056)

  console.log("Seed complete: 9 users, 4 courses, 3 quizzes, 4 assignments.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
