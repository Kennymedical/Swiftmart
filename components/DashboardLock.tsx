'use client';

import { useEffect } from 'react';

/**
 * Traps the browser back button while inside the dashboard.
 * Prevents accidental exit back to the customer storefront unless
 * the explicit "Exit Dashboard" button is clicked.
 */
export function DashboardLock() {
  useEffect(() => {
    // Push an extra history entry to catch the back button
    window.history.pushState({ dashboardLocked: true }, '', window.location.href);

    const handlePopState = () => {
      // Re-trap the history so user stays in dashboard
      window.history.pushState({ dashboardLocked: true }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
}
