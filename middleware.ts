import { auth } from "@/auth";

// The `authorized` callback in src/auth.ts does the actual gating; here we
// just wire NextAuth's edge middleware and set the matcher so static assets
// and API routes bypass the auth check.
export default auth((_req) => {
  // Return void → NextAuth handles the redirect via `pages.signIn`.
});

export const config = {
  matcher: [
    // Everything except: NextAuth API, other API, Next internals, static files.
    "/((?!api/auth|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
