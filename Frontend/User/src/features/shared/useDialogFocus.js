import { useEffect, useRef } from "react";

// Keep keyboard navigation inside an open dialog and return to its trigger on close.
export default function useDialogFocus(active = true, onEscape) {
  const ref = useRef(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;
    const previous = document.activeElement;
    const controls = () => Array.from(dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter((el) => !el.hidden && el.getAttribute("aria-hidden") !== "true");
    controls()[0]?.focus();
    function onKey(event) {
      if (event.key === "Escape" && escapeRef.current) { event.preventDefault(); escapeRef.current(); }
      if (event.key !== "Tab") return;
      const items = controls();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    dialog.addEventListener("keydown", onKey);
    return () => {
      dialog.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);
  return ref;
}
