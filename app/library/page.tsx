"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  getActiveLicense,
  isExpired,
  License,
} from "@/lib/license";

export default function LibraryPage() {
  const router = useRouter();
  const [license, setLicense] = useState<License | null>(null);

  useEffect(() => {
    const lic = getActiveLicense();
    setLicense(lic);
  }, []);

  if (!license) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-sm text-gray-500">
            No textbooks in your library.
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push("/select-books?add=true")}>
            ➕ Add textbook
          </Button>
        </div>
      </div>
    );
  }

  const expired = isExpired(license);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">My Library</h1>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/select-books?add=true")}
          >
            ➕ Add textbook
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/logout")}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* 단일 라이선스 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {license.lang.toUpperCase()} · {license.series} ·{" "}
            {license.level.toUpperCase()}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Expires:{" "}
            {new Date(license.expiresAt).toLocaleDateString()}
          </div>

          <Button
            size="sm"
            disabled={expired}
            onClick={() =>
              router.push(
                `/viewer/${license.lang}/${license.series}/${license.level}`
              )
            }
          >
            {expired ? "Expired" : "Open"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
