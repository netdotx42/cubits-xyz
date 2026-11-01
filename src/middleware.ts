import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Fail closed for the app if Supabase is not configured, instead of crashing every request.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (req.nextUrl.pathname.startsWith("/app")) return new NextResponse("Supabase is not configured.", { status: 503 });
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  if (!user && path.startsWith("/app")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/signup")) {
    const url = req.nextUrl.clone();
    const invite = req.nextUrl.searchParams.get("invite");
    url.pathname = invite ? `/invite/${invite}` : "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // Only run where auth matters; marketing pages and public APIs skip the Supabase round trip.
  matcher: ["/app/:path*", "/login", "/signup"],
};
