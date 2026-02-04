"use client";

import ViewerGuard from "../ViewerGuard";

export default function ViewerGuardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ViewerGuard>{children}</ViewerGuard>;
}
