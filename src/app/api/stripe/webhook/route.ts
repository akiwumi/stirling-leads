import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-04-22.dahlia" });
}

// Stripe v22 moves period fields — access them safely
type SubLike = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

function planKeyFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_SOLO_MONTHLY ?? ""]: "solo_monthly",
    [process.env.STRIPE_PRICE_SOLO_ANNUAL ?? ""]: "solo_annual",
    [process.env.STRIPE_PRICE_TEAM_MONTHLY ?? ""]: "team_monthly",
    [process.env.STRIPE_PRICE_TEAM_ANNUAL ?? ""]: "team_annual",
  };
  return map[priceId] ?? "solo_monthly";
}

function billingCycleFromPriceId(priceId: string): string {
  const annual = [
    process.env.STRIPE_PRICE_SOLO_ANNUAL ?? "",
    process.env.STRIPE_PRICE_TEAM_ANNUAL ?? "",
  ];
  return annual.includes(priceId) ? "annual" : "monthly";
}

function seatsForPlan(planKey: string): number {
  if (planKey.startsWith("team")) return 3;
  return 1;
}

async function getStoredSubscriptionUserId(
  supabase: ReturnType<typeof createAdminClient>,
  stripeSubscriptionId: string,
) {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function resolveUserId(
  supabase: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
) {
  return sub.metadata?.supabase_user_id ?? (await getStoredSubscriptionUserId(supabase, sub.id));
}

async function syncSubscription(supabase: ReturnType<typeof createAdminClient>, sub: Stripe.Subscription) {
  const userId = await resolveUserId(supabase, sub);
  if (!userId) return;

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? "";
  const planKey = planKeyFromPriceId(priceId);
  const billingCycle = billingCycleFromPriceId(priceId);
  const seatsIncluded = seatsForPlan(planKey);
  const seatCount = item?.quantity ?? seatsIncluded;

  const s = sub as SubLike;
  const now = new Date().toISOString();
  const periodStart = s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : null;
  const periodEnd = s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null;
  const trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: String(sub.customer),
      stripe_price_id: priceId,
      plan_key: planKey,
      billing_cycle: billingCycle,
      subscription_status: sub.status,
      trial_started_at: trialStart,
      trial_ends_at: trialEnd,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      seats_included: seatsIncluded,
      seat_count: seatCount,
      updated_at: now,
    },
    { onConflict: "stripe_subscription_id" },
  );

  await supabase.from("users").update({
    stripe_subscription_id: sub.id,
    stripe_customer_id: String(sub.customer),
    stripe_price_id: priceId,
    plan_key: planKey,
    billing_cycle: billingCycle,
    subscription_status: sub.status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end,
    seats_included: seatsIncluded,
    seat_count: seatCount,
    ...(trialEnd ? { trial_ends_at: trialEnd } : {}),
  }).eq("id", userId);
}

async function getSubscriptionFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  // In Stripe v22, the subscription ID may be nested differently
  const inv = invoice as unknown as Record<string, unknown>;
  if (typeof inv.subscription === "string") return inv.subscription;
  const parent = inv.parent as Record<string, unknown> | undefined;
  if (parent) {
    const sd = parent.subscription_details as Record<string, unknown> | undefined;
    if (typeof sd?.subscription === "string") return sd.subscription;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new NextResponse("Webhook signature verification failed", { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        await syncSubscription(supabase, sub);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(supabase, sub);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(supabase, sub);
      if (userId) {
        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: String(sub.customer),
            stripe_price_id: sub.items.data[0]?.price?.id ?? null,
            plan_key: sub.items.data[0]?.price?.id ? planKeyFromPriceId(sub.items.data[0].price.id) : null,
            billing_cycle: sub.items.data[0]?.price?.id ? billingCycleFromPriceId(sub.items.data[0].price.id) : null,
            subscription_status: "canceled",
            current_period_end: (sub as SubLike).current_period_end
              ? new Date((sub as SubLike).current_period_end! * 1000).toISOString()
              : null,
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            seats_included: seatsForPlan(
              sub.items.data[0]?.price?.id ? planKeyFromPriceId(sub.items.data[0].price.id) : "solo_monthly",
            ),
            seat_count: sub.items.data[0]?.quantity ?? seatsForPlan(
              sub.items.data[0]?.price?.id ? planKeyFromPriceId(sub.items.data[0].price.id) : "solo_monthly",
            ),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
        await supabase.from("users").update({
          subscription_status: "canceled",
          cancel_at_period_end: Boolean(sub.cancel_at_period_end),
          current_period_end: (sub as SubLike).current_period_end
            ? new Date((sub as SubLike).current_period_end! * 1000).toISOString()
            : null,
        }).eq("id", userId);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = await getSubscriptionFromInvoice(invoice);
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncSubscription(supabase, sub);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = await getSubscriptionFromInvoice(invoice);
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = await resolveUserId(supabase, sub);
        if (userId) {
          await supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_customer_id: String(sub.customer),
              stripe_price_id: sub.items.data[0]?.price?.id ?? null,
              plan_key: sub.items.data[0]?.price?.id ? planKeyFromPriceId(sub.items.data[0].price.id) : null,
              billing_cycle: sub.items.data[0]?.price?.id ? billingCycleFromPriceId(sub.items.data[0].price.id) : null,
              subscription_status: "past_due",
              current_period_start: (sub as SubLike).current_period_start
                ? new Date((sub as SubLike).current_period_start! * 1000).toISOString()
                : null,
              current_period_end: (sub as SubLike).current_period_end
                ? new Date((sub as SubLike).current_period_end! * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end,
              seats_included: seatsForPlan(
                sub.items.data[0]?.price?.id ? planKeyFromPriceId(sub.items.data[0].price.id) : "solo_monthly",
              ),
              seat_count: sub.items.data[0]?.quantity ?? seatsForPlan(
                sub.items.data[0]?.price?.id ? planKeyFromPriceId(sub.items.data[0].price.id) : "solo_monthly",
              ),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" },
          );
          await supabase.from("users").update({ subscription_status: "past_due" }).eq("id", userId);
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
