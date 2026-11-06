/**
 * Runs once per server instance before any request.
 * Vercel functions run in UTC while users (Saigon Technology, Vietnam) browse in UTC+7; dates formatted with
 * dayjs in client components then differ between the server render and hydration (React #418).
 * Pin the server to the company time zone so both sides print the same text.
 * (`TZ` is a reserved env var name on Vercel, so it is set here instead.)
 */
export function register() {
  process.env.TZ = process.env.APP_TIME_ZONE ?? "Asia/Ho_Chi_Minh";
}
