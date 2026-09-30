import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY is not configured in Supabase secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid admin authentication token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized. Admin role required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amountKobo, bankCode, bankName, accountNumber, accountName } = await req.json();

    if (!amountKobo || amountKobo < 10000) {
      return new Response(JSON.stringify({ error: "Minimum withdrawal is ₦100 (10,000 kobo)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bankCode || !accountNumber || accountNumber.length !== 10) {
      return new Response(JSON.stringify({ error: "Invalid bank account details provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read treasury safely without hardcoded UUID
    const { data: treasury, error: treasErr } = await supabaseAdmin
      .from("platform_treasury")
      .select("id, balance_kobo")
      .limit(1)
      .maybeSingle();

    if (treasErr || !treasury) {
      return new Response(JSON.stringify({ error: "Could not read treasury balance from database." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (treasury.balance_kobo < amountKobo) {
      return new Response(
        JSON.stringify({
          error: `Insufficient treasury balance. Available: ₦${(treasury.balance_kobo / 100).toLocaleString()}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Paystack transfer recipient
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: accountName || "SwiftMart Admin",
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      }),
    });

    const recipientData = await recipientRes.json();
    if (!recipientRes.ok || !recipientData.status || !recipientData.data?.recipient_code) {
      return new Response(
        JSON.stringify({
          error: `Paystack recipient error: ${recipientData.message || "Failed to create transfer recipient on Paystack."}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientCode = recipientData.data.recipient_code;

    // Initiate Paystack Transfer
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountKobo,
        recipient: recipientCode,
        reason: `SwiftMart Admin Profit Withdrawal - ${profile.full_name || "Admin"}`,
      }),
    });

    const transferData = await transferRes.json();
    if (!transferRes.ok || !transferData.status) {
      return new Response(
        JSON.stringify({
          error: `Paystack transfer rejected: ${transferData.message || "Check your Paystack dashboard balance and ensure transfers are enabled."}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Debit treasury after Paystack confirmation
    const newBalance = treasury.balance_kobo - amountKobo;
    await supabaseAdmin
      .from("platform_treasury")
      .update({ balance_kobo: newBalance, updated_at: new Date().toISOString() })
      .eq("id", treasury.id);

    // Record in audit ledger
    await supabaseAdmin.from("platform_revenue").insert({
      source: "withdrawal",
      amount_kobo: -amountKobo,
      balance_after_kobo: newBalance,
      description: `Admin Profit Payout to ${accountName} (${accountNumber} - ${bankName || bankCode}) - Ref: ${transferData.data?.reference || transferData.data?.transfer_code || "N/A"}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payout successful!",
        transferCode: transferData.data?.transfer_code,
        reference: transferData.data?.reference,
        newBalanceKobo: newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error processing payout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
