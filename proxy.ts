import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Публичные маршруты
  if (pathname === "/login") {
    if (req.auth) {
      return NextResponse.redirect(new URL("/clients", req.url));
    }
    return NextResponse.next();
  }

  // Защищённые маршруты
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = req.auth.user?.role;

  // Ограничения по ролям
  if (role === "student") {
    const allowed = ["/schedule", "/clients"];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/schedule", req.url));
    }
  }

  if (role === "teacher") {
    const blocked = ["/subscriptions"];
    const isBlocked = blocked.some((p) => pathname.startsWith(p));
    if (isBlocked) {
      return NextResponse.redirect(new URL("/schedule", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
