import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    /*
     * 모든 요청에서 Clerk 실행
     * (단, 정적 파일만 제외)
     */
    "/((?!_next|favicon.ico|.*\\..*).*)",
  ],
};