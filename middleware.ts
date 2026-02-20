import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/market/create",
  "/admin",
  "/trades",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  const cookieOverrides = new Map<string, string>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const seen = new Set<string>();
          const result: { name: string; value: string }[] = [];
          request.cookies.getAll().forEach((c) => {
            seen.add(c.name);
            result.push({
              name: c.name,
              value: cookieOverrides.get(c.name) ?? c.value,
            });
          });
          cookieOverrides.forEach((value, name) => {
            if (!seen.has(name)) {
              result.push({ name, value });
            }
          });
          return result;
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieOverrides.set(name, value);
            response.cookies.set(name, value, options as object);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/market/create",
    "/admin/:path*",
    "/trades/:path*",
  ],
};
