import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Helper function to wipe all auth, token, and session cookies
  const clearSessionCookies = (res: NextResponse) => {
    request.cookies.getAll().forEach((cookie) => {
      if (
        cookie.name.startsWith('sb-') ||
        cookie.name.includes('token') ||
        cookie.name.includes('auth') ||
        cookie.name.startsWith('admin_')
      ) {
        res.cookies.delete(cookie.name);
        res.cookies.set(cookie.name, '', {
          path: '/',
          maxAge: 0,
          expires: new Date(0),
        });
      }
    });
  };

  // 1. Allow public access to logout endpoint without requiring an existing session
  if (pathname === '/api/admin/logout') {
    return response;
  }

  // 2. Reject removed/disabled endpoints
  if (pathname === '/api/admin/init') {
    return NextResponse.json({ error: 'Endpoint removed' }, { status: 404 });
  }

  // Helper to create Supabase client in middleware
  const createSupabase = () =>
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

  // 3. Handle protected API admin routes (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    const supabase = createSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return response;
  }

  // 4. Handle admin page routes (/admin/*)
  if (!pathname.startsWith('/admin')) {
    return response;
  }

  // Allow login page access
  if (pathname === '/admin/login') {
    return response;
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated, redirect to /admin/login
  if (!user) {
    const redirectRes = NextResponse.redirect(new URL('/admin/login', request.url));
    clearSessionCookies(redirectRes);
    return redirectRes;
  }

  // Anti-cache headers for authenticated admin routes
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
