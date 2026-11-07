import assert from 'node:assert/strict';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { DatabaseSync, backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

// Deliberately fixed to the isolated local review DB. Never use DATABASE_URL here.
const database = resolve('.qa/review/preview.db');
assert(existsSync(database), 'Run npm run preview:local once to initialize the preview database.');
assert.notEqual(await realpath(database), await realpath('prisma/dev.db'), 'Refusing to seed the primary database.');
const state = resolve('.qa/review');
await mkdir(resolve(state, 'backups'), { recursive: true });
const backupPath = resolve(state, 'backups', `before-integrity-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
const source = new DatabaseSync(database, { readOnly: true });
try { await backup(source, backupPath); } finally { source.close(); }

export const fixture = {
  courseId: 'qa-integrity-course', groupId: 'qa-integrity-group', categoryId: 'qa-integrity-category',
  users: [
    { id: 'qa-integrity-an', email: 'qa.an@acme.vn', fullName: 'QA · Nguyễn An', employeeCode: 'QA-THI-001' },
    { id: 'qa-integrity-binh', email: 'qa.binh@acme.vn', fullName: 'QA · Trần Bình', employeeCode: 'QA-THI-002' },
    { id: 'qa-integrity-chi', email: 'qa.chi@acme.vn', fullName: 'QA · Lê Chi', employeeCode: 'QA-THI-003' },
  ],
};
const lessons = [
  {
    id: 'qa-integrity-lesson-security', title: 'Bảo mật thông tin và xử lý tình huống', durationMinutes: 4,
    articleBody: `<h2>Bảo vệ tài khoản và dữ liệu</h2>
<p>Tài khoản học tập là tài khoản cá nhân. Không chia sẻ mật khẩu hoặc mã xác thực một lần (OTP) cho đồng nghiệp. Bật xác thực nhiều yếu tố khi hệ thống hỗ trợ. Khi rời máy, khóa màn hình để người khác không truy cập phiên đăng nhập của bạn.</p>
<h3>Email và đường dẫn đáng ngờ</h3><p>Nếu một email yêu cầu nhập mật khẩu vào đường dẫn lạ, không mở đường dẫn và không cung cấp thông tin. Báo cho bộ phận phụ trách bảo mật qua kênh nội bộ đã xác minh. Không dùng số điện thoại hoặc địa chỉ hỗ trợ chỉ xuất hiện trong email đáng ngờ.</p>
<h3>Lưu trữ và chia sẻ</h3><p>Chỉ chia sẻ tài liệu nội bộ cho người có quyền truy cập phù hợp. Dùng kho lưu trữ do công ty cho phép. Không tải danh sách khách hàng lên thư mục công khai hoặc gửi sang email cá nhân chỉ để thuận tiện. Nếu gửi nhầm dữ liệu, báo ngay cho người phụ trách để được hỗ trợ xử lý.</p>
<p>Nội dung này là dữ liệu học tập dành riêng cho bộ kiểm thử local.</p>`,
  },
  {
    id: 'qa-integrity-lesson-rules', title: 'Quy tắc làm bài và ghi nhận vi phạm', durationMinutes: 4,
    articleBody: `<h2>Thử hành vi vi phạm trên quiz số 01</h2>
<p>Đọc ngưỡng vi phạm trên màn hình trước khi bắt đầu. Đây là cấu hình chung do quản trị viên đặt. Khi số lần vi phạm vượt ngưỡng, lượt thi bị hủy, tính 0 điểm và vẫn tính một lượt đã dùng.</p>
<ul><li>Chuyển sang tab khác hoặc cửa sổ khác ít nhất 2 giây rồi quay lại.</li><li>Nhấp chuột phải trong vùng bài thi; ứng dụng chặn menu và ghi nhận sự kiện.</li><li>Thử sao chép hoặc in. Khả năng phát sinh sự kiện phụ thuộc trình duyệt và thao tác thực tế.</li><li>Các lần lặp cùng loại quá sát nhau được gộp; chờ hơn 2 giây giữa hai lần thử.</li></ul>
<h3>Thứ tự câu hỏi và thời gian</h3><p>Mỗi lượt xáo thứ tự câu hỏi và các lựa chọn. Chọn theo nội dung đáp án, không dựa vào ký tự A/B/C/D của người khác. Đồng hồ chạy theo thời gian máy chủ, không tạm dừng khi bạn rời trang. Quiz số 02 chỉ có 1 phút để thử tự nộp.</p>
<h3>Hình chìm và ảnh chụp màn hình</h3><p>Bài thi có hình chìm tên, mã nhân viên và thời gian. Web có thể nhận phím Print Screen ở một số môi trường nhưng không bảo đảm phát hiện mọi thao tác chụp màn hình của hệ điều hành, ví dụ tổ hợp chụp màn hình trên macOS.</p>`,
  },
  {
    id: 'qa-integrity-lesson-signals', title: 'Nhiều thí sinh và cách đọc cờ bất thường', durationMinutes: 5,
    articleBody: `<h2>Thử tín hiệu, không tạo sẵn kết quả</h2>
<p>Dùng tài khoản QA An và QA Bình trong hai profile trình duyệt hoặc hai phiên riêng để làm cùng quiz số 03. Hai tab trong cùng profile chia sẻ cookie; đăng nhập tài khoản khác sẽ đổi phiên của cả hai tab.</p>
<ul><li><strong>Nhiều tab:</strong> trong cùng tài khoản, mở tab trống mới và dán URL lượt đang làm. Không chỉ nhân bản tab vì trình duyệt có thể sao chép sessionStorage. Mỗi tab gửi heartbeat với token riêng.</li><li><strong>Cùng mạng, cùng lúc:</strong> hai tài khoản làm cùng quiz trong khoảng thời gian giao nhau và có IP trùng sẽ được gắn cờ. Đây chỉ là tín hiệu: nhiều người trong công ty có thể dùng chung mạng.</li><li><strong>Nộp quá nhanh:</strong> lượt có ít nhất 3 câu, đã lưu ít nhất một đáp án, và thời gian từ bắt đầu đến nộp dưới 5 giây nhân số câu sẽ được gắn cờ.</li><li><strong>Đáp án giống nhau:</strong> hai người nộp cùng quiz với ít nhất 5 đáp án đã lưu giống hệt theo ID câu hỏi và lựa chọn gốc sẽ được gắn cờ. Chọn cùng nội dung, không chọn cùng chữ cái.</li></ul>
<p>Cờ bất thường không tự hủy bài hoặc tự trừ điểm. Quản trị viên mở Kết quả → Giám sát thi, lọc khóa học này rồi bấm vào lượt để xem nhật ký. Có thể cần tải lại màn hình quản trị để lấy dữ liệu mới.</p>`,
  },
];
// Authored demo content: no AI API call and no fabricated AI review log.
const bank = [
  ['Khi nhận email yêu cầu nhập mật khẩu vào đường dẫn lạ, bạn nên làm gì?', ['Nhập thử để kiểm tra', 'Chuyển tiếp kèm mật khẩu', 'Không cung cấp thông tin và báo qua kênh nội bộ đã xác minh', 'Đăng đường dẫn vào nhóm công khai'], 2, 'Không nhập thông tin vào đường dẫn đáng ngờ; báo qua kênh đã xác minh.'],
  ['Đồng nghiệp nhờ bạn gửi mã OTP để đăng nhập hộ. Cách xử lý phù hợp là gì?', ['Không chia sẻ OTP; hướng dẫn họ dùng tài khoản riêng', 'Gửi OTP qua chat riêng', 'Gửi cả mật khẩu và OTP', 'Cho mượn phiên đăng nhập'], 0, 'OTP và mật khẩu thuộc thông tin xác thực cá nhân.'],
  ['Bạn chuẩn bị rời máy tính đang đăng nhập hệ thống. Bạn nên làm gì?', ['Giữ nguyên vì chỉ đi ít phút', 'Gửi tài khoản cho người ngồi cạnh', 'Tắt đèn màn hình', 'Khóa màn hình'], 3, 'Khóa màn hình bảo vệ phiên đang đăng nhập.'],
  ['Tài liệu nội bộ nên được chia sẻ như thế nào?', ['Đưa vào link công khai cho tiện', 'Chỉ chia sẻ cho người có quyền qua kho được công ty cho phép', 'Gửi toàn bộ sang email cá nhân', 'Ai hỏi cũng có thể nhận'], 1, 'Giới hạn người nhận và dùng kho lưu trữ được cho phép.'],
  ['Khi phát hiện vừa gửi nhầm dữ liệu nội bộ, bạn nên làm gì?', ['Báo ngay cho người phụ trách để được hỗ trợ xử lý', 'Bỏ qua vì không thể thu hồi', 'Xóa mọi dấu vết và không báo', 'Đăng dữ liệu lên mạng để hỏi cách sửa'], 0, 'Báo sớm giúp hỗ trợ xử lý sự cố gửi nhầm dữ liệu.'],
  ['Biện pháp nào giúp tăng bảo vệ tài khoản khi được hệ thống hỗ trợ?', ['Dùng chung mật khẩu cả nhóm', 'Lưu mật khẩu trên trang công khai', 'Bật xác thực nhiều yếu tố', 'Tắt thông báo đăng nhập'], 2, 'Xác thực nhiều yếu tố bổ sung lớp bảo vệ tài khoản.'],
  ['Nếu số lần vi phạm vượt ngưỡng quản trị viên đặt, hệ thống xử lý lượt thi ra sao?', ['Chỉ đổi thứ tự câu hỏi', 'Hủy lượt, tính 0 điểm và vẫn tính lượt đã dùng', 'Tặng thêm thời gian', 'Tự xóa toàn bộ lịch sử của tài khoản'], 1, 'Ngưỡng là số lần được phép; chỉ khi vượt ngưỡng mới hủy lượt.'],
  ['Vì sao nên so sánh nội dung đáp án thay vì chữ A/B/C/D giữa hai người?', ['Vì chữ cái không được lưu', 'Vì mọi đáp án đều đúng', 'Vì điểm được chọn ngẫu nhiên', 'Vì mỗi lượt xáo thứ tự các lựa chọn'], 3, 'Thứ tự lựa chọn được xáo theo từng lượt thi.'],
  ['Khi rời trang làm bài, đồng hồ được xử lý như thế nào?', ['Vẫn chạy theo thời gian máy chủ', 'Luôn dừng cho đến khi quay lại', 'Tự cộng thêm 5 phút', 'Chạy lại từ đầu khi tải lại'], 0, 'Thời gian máy chủ quyết định hạn làm bài.'],
  ['Cờ cùng mạng giữa hai thí sinh có ý nghĩa gì?', ['Chứng minh chắc chắn hai người gian lận', 'Tự động hủy cả hai lượt', 'Là tín hiệu để quản trị viên xem xét thêm', 'Tự động khóa cả nhóm'], 2, 'Nhiều người có thể hợp lệ dùng chung IP; cờ không phải kết luận.'],
  ['Muốn thử token nhiều tab cho cùng một lượt, cách nào phù hợp nhất?', ['Đăng nhập người khác trong cùng profile', 'Mở tab trống mới rồi dán URL lượt đang làm của cùng tài khoản', 'Chỉ đổi độ sáng màn hình', 'Chỉ xem trang khóa học ở tab khác'], 1, 'Tab trống mới tránh việc nhân bản cả sessionStorage của tab đang làm.'],
  ['Quản trị viên xem chi tiết sự kiện vi phạm ở đâu?', ['Trang danh mục khóa học', 'Trang chỉnh sửa ảnh bìa', 'Màn đổi giao diện sáng tối', 'Kết quả → Giám sát thi → chọn lượt thi'], 3, 'Chọn lượt thi trong Giám sát thi để mở nhật ký.'],
];
const quizzes = [
  { id: 'qa-integrity-quiz-behavior', title: '01 · Thử vi phạm và hủy lượt thi', timeLimitMinutes: 20, indexes: [0,1,2,3,4,5,6,7,8,9] },
  { id: 'qa-integrity-quiz-timer', title: '02 · Đồng hồ 1 phút và tự nộp bài', timeLimitMinutes: 1, indexes: [0,1,2,6,7,8] },
  { id: 'qa-integrity-quiz-compare', title: '03 · Nhiều thí sinh và cờ bất thường', timeLimitMinutes: 10, indexes: [6,7,8,9,10,11] },
];
const prisma = new PrismaClient({ datasourceUrl: `file:${database}` });
try {
  const result = await prisma.$transaction(async (db) => {
    const admin = await db.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true, email: true } });
    assert(admin, 'An active admin is required.');
    await db.group.upsert({ where: { id: fixture.groupId }, update: {}, create: { id: fixture.groupId, name: 'QA · Kiểm thử gian lận' } });
    await db.category.upsert({ where: { id: fixture.categoryId }, update: {}, create: { id: fixture.categoryId, name: 'QA · Thực hành kiểm thử' } });
    for (const person of fixture.users) {
      const user = await db.user.upsert({ where: { id: person.id }, update: {}, create: { ...person, role: 'MEMBER', status: 'ACTIVE', groupId: fixture.groupId, jobTitle: 'Thí sinh thử nghiệm local' } });
      assert(user.email === person.email && user.role === 'MEMBER' && user.groupId === fixture.groupId, `Fixture identity conflict: ${person.id}`);
    }
    const course = await db.course.upsert({ where: { id: fixture.courseId }, update: {}, create: {
      id: fixture.courseId, title: 'QA Lab · Thực hành giám sát và chống gian lận',
      description: 'Bộ dữ liệu local: 3 bài học, 3 quiz và 3 thí sinh. Thử chuyển tab, chuột phải, tự nộp, nhiều phiên và các cờ bất thường. Không có kết quả gian lận tạo sẵn.',
      categoryId: fixture.categoryId, coverImage: 'seed-security.svg', status: 'PUBLISHED', updatedBy: 'QA fixture · local',
    } });
    assert.equal(course.categoryId, fixture.categoryId, 'Course identity conflict');
    await db.courseAccess.upsert({ where: { id: 'qa-integrity-access' }, update: {}, create: { id: 'qa-integrity-access', courseId: fixture.courseId, groupId: fixture.groupId } });
    for (const [position, lesson] of lessons.entries()) {
      await db.lesson.upsert({ where: { id: lesson.id }, update: {}, create: { ...lesson, courseId: fixture.courseId, position: position + 1, type: 'ARTICLE' } });
    }
    for (const quiz of quizzes) {
      await db.quiz.upsert({ where: { id: quiz.id }, update: {}, create: {
        id: quiz.id, courseId: fixture.courseId, title: quiz.title, status: 'PUBLISHED', publishedAt: new Date(),
        passScore: 80, maxAttempts: 20, timeLimitMinutes: quiz.timeLimitMinutes, reviewReleased: false,
      } });
      for (const lesson of lessons) {
        await db.quizSourceLesson.upsert({ where: { quizId_lessonId: { quizId: quiz.id, lessonId: lesson.id } }, update: {}, create: { quizId: quiz.id, lessonId: lesson.id } });
      }
      for (const [position, bankIndex] of quiz.indexes.entries()) {
        const [text, options, correctIndex, explanation] = bank[bankIndex];
        await db.question.upsert({ where: { id: `${quiz.id}-question-${position + 1}` }, update: {}, create: {
          id: `${quiz.id}-question-${position + 1}`, quizId: quiz.id, position: position + 1, text,
          options: JSON.stringify(options), correctIndex, explanation, reviewStatus: 'APPROVED', origin: 'MANUAL',
        } });
      }
    }
    const assignment = await db.assignment.upsert({ where: { id: 'qa-integrity-assignment' }, update: {}, create: {
      id: 'qa-integrity-assignment', courseId: fixture.courseId, createdById: admin.id, deadline: new Date(Date.now() + 30 * 86400000),
    } });
    await db.assignmentTarget.upsert({ where: { id: 'qa-integrity-target' }, update: {}, create: { id: 'qa-integrity-target', assignmentId: assignment.id, groupId: fixture.groupId } });
    return { admin: admin.email, deadline: assignment.deadline };
  }, { timeout: 20000 });
  const setting = await prisma.setting.findUnique({ where: { key: 'quiz.maxViolations' } });
  const configured = setting ? Number(setting.value) : 3;
  const maxViolations = Number.isInteger(configured) && configured >= 0 ? configured : 3;
  const courses = await prisma.course.findUniqueOrThrow({ where: { id: fixture.courseId }, include: { _count: { select: { lessons: true } }, quizzes: { include: { _count: { select: { questions: true } } }, orderBy: { title: 'asc' } } } });
  const manifest = {
    ...result, database, backup: backupPath, courseId: fixture.courseId, maxViolations,
    users: fixture.users.map((u) => ({ email: u.email, name: u.fullName })),
    courseUrl: `http://127.0.0.1:3001/learn/courses/${fixture.courseId}`,
    monitorUrl: `http://127.0.0.1:3001/admin/results?tab=integrity&course=${fixture.courseId}&group=${fixture.groupId}`,
    lessons: courses._count.lessons,
    quizzes: courses.quizzes.map((q) => ({ id: q.id, title: q.title, questions: q._count.questions, minutes: q.timeLimitMinutes, attempts: q.maxAttempts, url: `http://127.0.0.1:3001/learn/quizzes/${q.id}` })),
    existingAttempts: await prisma.attempt.count({ where: { quiz: { courseId: fixture.courseId } } }),
  };
  assert.equal(manifest.lessons, 3); assert.equal(manifest.quizzes.length, 3);
  assert.equal(manifest.quizzes.reduce((sum, q) => sum + q.questions, 0), 22);
  await writeFile(resolve(state, 'integrity-demo.json'), JSON.stringify(manifest, null, 2));
  await writeFile(resolve(state, 'integrity-answer-key.json'), JSON.stringify(quizzes.map((q) => ({ quiz: q.title, answers: q.indexes.map((i) => ({ question: bank[i][0], answer: bank[i][1][bank[i][2]] })) })), null, 2));
  console.log(JSON.stringify(manifest, null, 2));
} finally { await prisma.$disconnect(); }
