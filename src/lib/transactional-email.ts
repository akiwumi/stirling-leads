import { Resend } from "resend";

import { createClient } from "@/lib/supabase/server";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildWelcomeEmailContent(name: string) {
  const safeName = escapeHtml(name);
  const appUrl = getAppUrl();

  return {
    subject: `Welcome to Stirling, ${name}`,
    body: [
      `<p>Hi ${safeName},</p>`,
      "<p>Welcome to Stirling. Your workspace is ready and your 2-day self-serve trial is now live.</p>",
      "<p>Solo starts at $42 per month or $408 per year. Team starts at $149 per month or $1,428 per year. Enterprise is handled on a custom annual contract.</p>",
      "<p>Stripe manages checkout, billing changes, and the customer portal. No refunds are offered after the trial.</p>",
      `<p><a href="${appUrl}/dashboard">Open your dashboard</a> and start building your first campaign.</p>`,
      "<p>Best,<br />Stirling</p>",
    ].join(""),
  };
}

export async function sendStoredTransactionalEmail({
  userId,
  recipientEmail,
  emailType,
  subject,
  body,
}: {
  userId: string;
  recipientEmail: string;
  emailType: string;
  subject: string;
  body: string;
}) {
  const supabase = await createClient();
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  const { data: inserted, error: insertError } = await supabase
    .from("transactional_emails")
    .insert({
      user_id: userId,
      email_type: emailType,
      recipient_email: recipientEmail,
      subject,
      body,
      status: resendKey && fromEmail ? "queued" : "failed",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error("Could not store transactional email.");
  }

  if (!resendKey || !fromEmail) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  const resend = new Resend(resendKey);
  const result = await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject,
    html: body,
  });

  if (result.error) {
    await supabase
      .from("transactional_emails")
      .update({
        status: "failed",
      })
      .eq("id", inserted.id);
    throw new Error(result.error.message || "Welcome email send failed.");
  }

  await supabase
    .from("transactional_emails")
    .update({
      status: "sent",
      provider_message_id: result.data?.id || null,
      sent_at: new Date().toISOString(),
    })
    .eq("id", inserted.id);

  return inserted.id;
}
