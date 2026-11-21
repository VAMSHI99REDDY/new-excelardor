"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@/utils/supabase/client';

export function SecurityEnforcer() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current || pathname === '/admin/login') return;
    hasChecked.current = true;

    // Detect browser reload event
    const navEntries = performance.getEntriesByType('navigation');
    const navTiming = navEntries[0] as PerformanceNavigationTiming | undefined;

    if (navTiming && navTiming.type === 'reload') {
      supabase.auth.signOut().finally(() => {
        // Clear cookies and session storage on reload
        document.cookie.split(';').forEach((c) => {
          const name = c.split('=')[0].trim();
          if (
            name.startsWith('sb-') ||
            name.includes('token') ||
            name.includes('auth') ||
            name === 'admin_login_fresh'
          ) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          }
        });
        sessionStorage.clear();
        router.replace('/admin/login');
      });
    }
  }, [pathname, router, supabase]);

  return null;
}
