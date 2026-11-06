"use client";

/**
 * Behaviour for the "Night Glow" demo theme (src/app/night.css):
 * 1. the light core inside primary buttons follows the pointer (--lx);
 * 2. panels below the fold rise in when scrolled into view (Web Animations API).
 * Panels already on screen are left alone (the page-enter animation covers them), so nothing flashes.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PRIMARY = ".ant-btn-color-primary.ant-btn-variant-solid";
const PANELS = ".ant-layout-content .ant-card, .ant-layout-content .ant-table-wrapper, .lh-welcome .ant-card";

export default function NightFx() {
  const pathname = usePathname();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const btn = (e.target as Element | null)?.closest?.(PRIMARY) as HTMLElement | null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--lx", `${e.clientX - r.left}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Web Animations only: no class/attribute is written, so React hydration never sees a mismatch.
    const seen = new WeakSet<Element>();
    const pending = new Map<Element, Animation>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          pending.get(e.target)?.play();
          pending.delete(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => {
      document.querySelectorAll<HTMLElement>(PANELS).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const outer = el.parentElement?.closest(PANELS);
        if (outer && pending.has(outer)) return; // the outer panel already animates
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already visible
        const anim = el.animate(
          [
            { opacity: 0, transform: "translateY(20px)", filter: "blur(6px)" },
            { opacity: 1, transform: "none", filter: "none" },
          ],
          { duration: 800, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fill: "backwards" },
        );
        anim.pause();
        pending.set(el, anim);
        io.observe(el);
      });
    };
    scan();
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
      pending.forEach((a) => a.finish());
    };
  }, [pathname]);

  return null;
}
