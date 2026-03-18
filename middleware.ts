import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|api).*)", // ✅ 여기만 추가
  ],
};