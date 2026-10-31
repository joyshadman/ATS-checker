"use client";

import { useEffect } from "react";

export const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * Warns before losing unsaved edits (spec 0002, AC-9): the browser prompt on close or
 * reload, and a confirm before following any internal link (sidebar included). The
 * App Router cannot block navigation, so links are caught in the capture phase, before
 * Next's <Link> handler runs. Browser Back and programmatic router.push are not covered.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page or only a #hash: nothing is lost.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [dirty]);
}
