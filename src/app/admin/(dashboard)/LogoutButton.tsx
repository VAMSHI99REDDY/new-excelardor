"use client";

import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@/utils/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear all session and auth cookies
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
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="block w-full text-left px-4 py-2 mt-4 rounded-lg hover:bg-red-50 hover:text-red-700 font-medium text-gray-700 transition-colors cursor-pointer"
    >
      Logout
    </button>
  );
}
