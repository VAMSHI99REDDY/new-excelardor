import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

async function performLogout(request: NextRequest) {
  let response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.json({ success: true });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Logout error during Supabase signOut:', err);
  }

  // Clear all Supabase auth and admin cookies
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name.startsWith('admin_')) {
      response.cookies.delete(cookie.name);
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
    }
  });

  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export async function POST(request: NextRequest) {
  return performLogout(request);
}

export async function GET(request: NextRequest) {
  const logoutRes = await performLogout(request);
  const redirectRes = NextResponse.redirect(new URL('/admin/login', request.url));

  // Copy cleared cookies over to redirect response
  logoutRes.cookies.getAll().forEach((cookie) => {
    redirectRes.cookies.set(cookie.name, cookie.value, {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
  });

  return redirectRes;
}
