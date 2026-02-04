"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getActiveLicense } from "@/lib/license";

export function useViewerGuard(
  series: string,
  level: string,
  onAuthorized?: (license: any) => void
) {
  const router = useRouter();

  useEffect(() => {
    const license = getActiveLicense();

    if (
      !license ||
      license.series !== series ||
      license.level !== level
    ) {
      router.replace("/select-books");
      return;
    }

    onAuthorized?.(license);
  }, [router, series, level, onAuthorized]);
}
