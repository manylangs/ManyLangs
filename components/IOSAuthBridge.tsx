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

        ;(window as any)
          .webkit
          ?.messageHandlers
          ?.native
          ?.postMessage({
            type: "AUTH_SUCCESS",
            token,
            userId: user?.id
          })

        ;(window as any)
          .webkit
          ?.messageHandlers
          ?.native
          ?.postMessage({
            type: "DISMISS_AUTH"
          })

        console.log("✅ AUTH SENT TO IOS")

      } catch (error) {

        console.error(
          "❌ IOS AUTH BRIDGE ERROR",
          error
        )
      }
    }

    sendAuthToIOS()

  }, [isSignedIn, session, user])

  return null
}