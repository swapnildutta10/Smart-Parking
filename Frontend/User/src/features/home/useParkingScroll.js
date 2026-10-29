import React from "react";
import { getParkingScrollProgress, getParkingScrollView } from "./parkingScroll";

// Native page scrolling only: no wheel interception, routing changes or scroll locking.
export default function useParkingScroll(storyRef) {
  const scrollStateRef = React.useRef({ enabled: false, progress: 0 });
  React.useEffect(() => {
    const story = storyRef.current;
    if (!story) return undefined;
    const media = window.matchMedia("(min-width: 1000px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    function update() {
      frame = 0;
      const nav = story.closest(".home-page")?.querySelector(".home-nav");
      const navHeight = nav?.getBoundingClientRect().height || 78;
      story.style.setProperty("--home-nav-height", `${navHeight}px`);
      const enabled = media.matches && story.dataset.staticScene !== "true";
      story.dataset.scrollEnabled = String(enabled);
      const rect = story.getBoundingClientRect();
      story.style.setProperty("--hero-top-inset", `${Math.max(navHeight, Math.min(window.innerHeight, rect.top))}px`);
      const progress = enabled ? getParkingScrollProgress({ top: rect.top, height: rect.height, viewportHeight: window.innerHeight, navHeight }) : 0;
      scrollStateRef.current = { enabled, progress };
      story.style.setProperty("--parking-scroll", String(progress));
      story.dataset.scrollStep = getParkingScrollView(progress).step;
      story.querySelector("[data-scroll-progress]")?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    }
    function schedule() { if (!frame) frame = window.requestAnimationFrame(update); }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [storyRef]);
  return scrollStateRef;
}
