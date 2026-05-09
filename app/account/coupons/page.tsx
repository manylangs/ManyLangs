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
  source?: string | null;
  purchaseToken?: string | null;
};

const GOOGLE_PLAY_ORDER_HISTORY_URL =
  "https://play.google.com/store/account/orderhistory";

// purchaseToken 기준으로 쿠폰 그룹화
function groupByPurchaseToken(coupons: Coupon[]) {
  const groups: Record<string, Coupon[]> = {};
  const ungrouped: Coupon[] = [];

  for (const c of coupons) {
    if (c.source === "google_play" && c.purchaseToken) {
      if (!groups[c.purchaseToken]) groups[c.purchaseToken] = [];
      groups[c.purchaseToken].push(c);
    } else {
      ungrouped.push(c);
    }
  }

  return { groups, ungrouped };
}

// 환불 가능 여부: 전체 미사용이어야 함
function canRefund(coupons: Coupon[]) {
  if (coupons.length === 0) return false;
  return coupons.every(
    (c) => c.source === "google_play" && c.status === "Unused"
  );
}

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

  const { groups, ungrouped } = groupByPurchaseToken(coupons);

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

        {/* Google Play 구매 그룹 */}
        {Object.entries(groups).map(([token, groupCoupons]) => {
          const refundable = canRefund(groupCoupons);

          return (
            <div key={token} className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Google Play Purchase</span>
                {refundable ? (
                  <a
                    href={GOOGLE_PLAY_ORDER_HISTORY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Request Refund →
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 line-through">
                    Refund unavailable (coupon used)
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {groupCoupons.map(c => {
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
                          <Badge className="bg-green-600 text-white">Unused</Badge>
                        )}
                        {c.status === "Activated" && (
                          <Badge variant="secondary">Used</Badge>
                        )}
                        {c.status === "Expired" && (
                          <Badge className="bg-gray-400 text-white">Expired</Badge>
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
          );
        })}

        {/* 일반 쿠폰 (free, stripe 등) */}
        {ungrouped.length > 0 && (
          <div className="mt-6 space-y-3">
            {ungrouped.map(c => {
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
                      <Badge className="bg-green-600 text-white">Unused</Badge>
                    )}
                    {c.status === "Activated" && (
                      <Badge variant="secondary">Used</Badge>
                    )}
                    {c.status === "Expired" && (
                      <Badge className="bg-gray-400 text-white">Expired</Badge>
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
        )}
      </div>
    </main>
  );
}