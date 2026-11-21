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

  // Check if request is a full browser document navigation (refresh, reload, or direct URL enter)
  const isRSC = request.headers.get('rsc') === '1';
  const secFetchDest = request.headers.get('sec-fetch-dest');
  const secFetchMode = request.headers.get('sec-fetch-mode');
  const acceptHeader = request.headers.get('accept') || '';

  const isDocumentNavigation =
    secFetchDest === 'document' ||
    secFetchMode === 'navigate' ||
    (!isRSC && acceptHeader.includes('text/html'));

  const hasFreshTicket =
    request.cookies.get('admin_fresh_login')?.value === 'true' ||
    request.cookies.get('admin_login_fresh')?.value === '1';

  if (isDocumentNavigation) {
    // If this is the immediate post-login navigation, consume ticket and allow access
    if (hasFreshTicket) {
      response.cookies.delete('admin_fresh_login');
      response.cookies.delete('admin_login_fresh');
      response.cookies.set('admin_fresh_login', '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
      response.cookies.set('admin_login_fresh', '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });

      // Anti-cache headers
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;
    }

    // Otherwise, this is a browser refresh or direct document load:
    // Terminate the Supabase session, clear all cookies, and redirect to login
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors if session was already terminated
    }

    const redirectRes = NextResponse.redirect(new URL('/admin/login', request.url));
    clearSessionCookies(redirectRes);

    redirectRes.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    redirectRes.headers.set('Pragma', 'no-cache');
    redirectRes.headers.set('Expires', '0');

    return redirectRes;
  }

  // For client-side SPA navigation, clear fresh ticket if still present
  if (hasFreshTicket) {
    response.cookies.delete('admin_fresh_login');
    response.cookies.delete('admin_login_fresh');
    response.cookies.set('admin_fresh_login', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    response.cookies.set('admin_login_fresh', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
  }

  // Anti-cache headers for internal client-side navigation as well
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
