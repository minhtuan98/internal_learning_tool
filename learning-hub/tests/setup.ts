import { beforeEach, vi } from "vitest";

// Never import a real database, session, network client, or Next runtime in unit tests.
const mocks = vi.hoisted(() => {
  const tables: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  const db = new Proxy(tables, {
    get(target, name: string) {
      if (name === "$transaction") return async (ops: Promise<unknown>[]) => Promise.all(ops);
      if (!target[name]) {
        target[name] = Object.fromEntries(
          ["findMany", "findFirst", "findUnique", "findUniqueOrThrow", "count", "create", "createMany", "update", "updateMany", "delete", "deleteMany", "upsert", "aggregate"].map((m) => [m, vi.fn()]),
        );
      }
      return target[name];
    },
  });
  for (const name of ["user", "group", "category", "course", "courseAccess", "lesson", "lessonProgress", "quiz", "quizSourceLesson", "question", "attempt", "answer", "assignment", "assignmentTarget", "aiCallLog", "certificate", "setting"]) void db[name];
  return { db, tables, admin: vi.fn(), member: vi.fn(), user: vi.fn(), cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }, revalidate: vi.fn() };
});

export { mocks };

vi.mock("@/lib/db", () => ({ prisma: mocks.db }));
vi.mock("@/lib/auth", () => ({ actionAdmin: mocks.admin, actionMember: mocks.member, getCurrentUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  for (const table of Object.values(mocks.tables)) {
    for (const [method, fn] of Object.entries(table)) {
      fn.mockReset();
      if (method === "findMany") fn.mockResolvedValue([]);
      else if (method === "count") fn.mockResolvedValue(0);
      else if (method === "aggregate") fn.mockResolvedValue({ _max: { position: null } });
      else if (["createMany", "updateMany", "deleteMany"].includes(method)) fn.mockResolvedValue({ count: 0 });
      else if (["create", "update", "upsert", "delete"].includes(method)) fn.mockImplementation(async (arg) => ({ id: "new-id", courseId: "c1", ...arg?.data }));
      else fn.mockResolvedValue(null);
    }
  }
  mocks.admin.mockReset().mockResolvedValue({ id: "admin", email: "admin@example.test", fullName: "Admin", role: "ADMIN" });
  mocks.member.mockReset().mockResolvedValue({ id: "u1", groupId: "g1", role: "MEMBER" });
  mocks.user.mockReset().mockResolvedValue(null);
  Object.values(mocks.cookies).forEach((fn) => fn.mockReset());
});
