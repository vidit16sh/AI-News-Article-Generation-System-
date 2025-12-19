"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Forces the window to scroll to the top on route changes.
 * Keeps all data-fetching and routing logic intact; this is purely a UI/UX fix.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Defer to the next frame so the new route's DOM is mounted.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [pathname, searchParams]);

  return null;
}
