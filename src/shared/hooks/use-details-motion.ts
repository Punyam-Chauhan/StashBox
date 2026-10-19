"use client";
import { useEffect, useRef, type MouseEvent } from "react";

/** Animate only the small menu surface; keep native details keyboard semantics. */
export function useDetailsMotion() {
  const ref = useRef<HTMLDetailsElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  function close(immediate = false) {
    const element = ref.current;
    if (!element?.open) return;
    clear();
    if (
      immediate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      element.open = false;
      delete element.dataset.closing;
      return;
    }
    element.dataset.closing = "true";
    timer.current = setTimeout(() => {
      element.open = false;
      delete element.dataset.closing;
      timer.current = null;
    }, 130);
  }
  function toggle(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    const element = ref.current;
    if (!element) return;
    if (element.open && !element.dataset.closing) {
      close();
      return;
    }
    clear();
    delete element.dataset.closing;
    element.open = true;
  }
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      clear();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return { ref, toggle, close };
}
