import Stripe from "stripe"
import { NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {

  try {

    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: "missing userId" },
        { status: 400 }
      )
    }

    // 🔎 Firestore에서 customerId 조회
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "user not found" },
        { status: 404 }
      )
    }

    const stripeCustomerId = userDoc.data()?.stripeCustomerId

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "stripe customer not found" },
        { status: 400 }
      )
    }

    // 🔵 Stripe Portal 생성
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: "https://manylangs.com/select-books"
    })

    return NextResponse.json({
      url: portal.url
    })

  } catch (e: any) {

    return NextResponse.json(
      { error: "portal creation failed" },
      { status: 500 }
    )

  }

}