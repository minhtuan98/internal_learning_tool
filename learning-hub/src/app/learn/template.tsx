/** Re-mounts on every navigation inside this segment → subtle page-enter fade (DESIGN_SYSTEM.md → Motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="lh-page">{children}</div>;
}
