import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { safeInvite, safeNext } from "@/lib/safe-next";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Fail closed for the app if Supabase is not configured, instead of crashing every request.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (req.nextUrl.pathname.startsWith("/app")) return new NextResponse("Supabase is not configured.", { status: 503 });
    return res;
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  if (!user && path === "/reset") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=link";
    return NextResponse.redirect(url);
  }
  if (!user && path.startsWith("/app")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Remember where they were headed so login can send them back.
    if (path !== "/app") url.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/signup")) {
    const url = req.nextUrl.clone();
    const invite = safeInvite(req.nextUrl.searchParams.get("invite"));
    const dest = invite ? `/invite/${invite}` : safeNext(req.nextUrl.searchParams.get("next"), "/app");
    const target = new URL(dest, req.url);
    url.pathname = target.pathname;
    url.search = target.search;
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // Only run where auth matters; marketing pages and public APIs skip the Supabase round trip.
  matcher: ["/app/:path*", "/login", "/signup", "/reset"],
};
