export { default as proxy } from "next-auth/middleware";

export const config = {
  // Everything behind login: the dashboard and all person/plan pages. The
  // landing page, /login, and /signup stay public.
  matcher: ["/app/:path*", "/people/:path*"],
};
