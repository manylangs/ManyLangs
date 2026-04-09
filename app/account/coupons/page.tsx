"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardHeader,
  CardContent,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

type Coupon = {
  code: string;
  status: "Unused" | "Activated" | "Expired";
  issuedAt?: number;
};

export default function MyCouponsPage() {
  const { user } = useUser();
  const userId = user?.id;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/coupons/my?userId=${userId}`)
      .then(res => res.json())
      .then(data => setCoupons(data.coupons ?? []));
  }, [userId]);

  function copyCoupon(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
  }

  return (
    <main className="flex justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-xl font-semibold">My Coupons</h1>

        <p className="mt-3 text-sm text-gray-500">
          Tap a coupon to copy the code.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Coupons may be shared or transferred to others. ManyLangs is not responsible
          for any issues arising from coupon sharing or transfer.
        </p>

        {coupons.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">
            No coupons available.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {coupons.map(c => {
            const isCopied = copiedCode === c.code;

            return (
              <Card
                key={c.code}
                onClick={() => copyCoupon(c.code)}
                className="cursor-pointer hover:shadow-sm transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <code className="font-mono font-semibold text-base">
                    {c.code}
                  </code>

                  {c.status === "Unused" && (
                    <Badge className="bg-green-600 text-white">
                      Unused
                    </Badge>
                  )}

                  {c.status === "Activated" && (
                    <Badge variant="secondary">
                      Used
                    </Badge>
                  )}

                  {c.status === "Expired" && (
                    <Badge className="bg-gray-400 text-white">
                      Expired
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {c.status === "Unused" && isCopied && (
                    <p className="mt-1 text-sm text-gray-700">
                      Enter this coupon code when selecting a textbook to get
                      30 days of access.
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Issued:{" "}
                    {c.issuedAt
                      ? new Date(c.issuedAt).toLocaleDateString()
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}