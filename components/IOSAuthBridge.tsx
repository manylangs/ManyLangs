"use client"

import { useEffect } from "react"
import { useUser, useSession } from "@clerk/nextjs"

export default function IOSAuthBridge() {

  const { isSignedIn, user } = useUser()
  const { session } = useSession()

  useEffect(() => {

    async function sendAuthToIOS() {

      if (!isSignedIn || !session) return

      try {

        const token = await session.getToken()

        // iOS 앱에 로그인 성공 전달
        ;(window as any).webkit?.messageHandlers?.auth?.postMessage({
          type: "AUTH_SUCCESS",
          token,
          userId: user?.id
        })

        // 핵심:
        // Safari OAuth overlay 닫기
        ;(window as any).webkit?.messageHandlers?.auth?.postMessage({
          type: "DISMISS_AUTH"
        })

        console.log("✅ AUTH SENT TO IOS")

      } catch (error) {

        console.error("❌ IOS AUTH BRIDGE ERROR", error)
      }
    }

    sendAuthToIOS()

  }, [isSignedIn, session, user])

  return null
}