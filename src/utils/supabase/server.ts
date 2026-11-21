import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Admin service role client for privileged backend operations (storage, RLS bypass for public forms/admin operations)
export const createAdminServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Maintained for backward-compatibility with public API routes (/api/apply, /api/contact)
export const createServerComponentClient = () => {
  return createAdminServiceClient();
};

// Authenticated SSR client that validates the Supabase session from HTTP cookies
export const createAuthenticatedServerClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignored when called in Server Components
          }
        },
      },
    }
  );
};

export const createAuthServerClient = createAuthenticatedServerClient;

// Enforces server-side authentication for Server Components; redirects to /admin/login if unauthenticated
export const requireAdminSession = async () => {
  const supabase = await createAuthenticatedServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/admin/login');
  }
  return user;
};

// Verifies server-side authentication for Server Actions and API Routes; returns user or null
export const verifyAdminSession = async () => {
  const supabase = await createAuthenticatedServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
};
