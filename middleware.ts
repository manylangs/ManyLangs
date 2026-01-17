import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    /*
      Clerk 컨텍스트는 모든 페이지에 제공
      (접근 제어는 페이지에서 직접 판단)
    */
    "/((?!_next|favicon.ico).*)",
  ],
};
