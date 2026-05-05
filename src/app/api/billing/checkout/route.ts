import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { TRIAL_DAYS } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-04-22.dahlia" });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const PRICE_IDS: Record<string, string | undefined> = {
    solo_monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY,
    solo_annual: process.env.STRIPE_PRICE_SOLO_ANNUAL,
    team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    team_annual: process.env.STRIPE_PRICE_TEAM_ANNUAL,
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planKey = String(body.plan_key ?? "solo_monthly");
  const priceId = PRICE_IDS[planKey];

  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan or price not configured" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email, full_name, stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (
    profile?.stripe_subscription_id &&
    ["active", "trialing", "past_due"].includes(profile.subscription_status ?? "")
  ) {
    return NextResponse.json(
      { error: "A subscription is already active for this workspace. Use the billing portal to change it." },
      { status: 409 },
    );
  }

  const email = profile?.email ?? user.email ?? "";

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { supabase_user_id: user.id, plan_key: planKey },
    },
    success_url: `${origin}/dashboard/billing?checkout=success`,
    cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
