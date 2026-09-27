import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SWIFTMART_PROFIT_KOBO = 50000; // ₦500.00 profit markup

// Fallback rates if Shipbubble API key is invalid or unavailable
const ZONE_RATES: Record<string, number> = {
  lagos: 200000,      // ₦2,000 base
  abuja: 250000,      // ₦2,500 base
  interstate: 350000, // ₦3,500 base
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { senderState, receiverState, receiverCity, receiverAddress, itemsCount } = await req.json();
    const apiKey = Deno.env.get("SHIPBUBBLE_API_KEY");

    let baseCourierKobo = 0;
    let courierName = "";
    let isLiveQuote = false;

    const sState = (senderState || "Lagos").trim();
    const rState = (receiverState || "Lagos").trim();
    const rCity = (receiverCity || rState).trim();
    const rAddr = (receiverAddress || `${rCity}, ${rState}, Nigeria`).trim();

    // 1. Live Shipbubble Rates Lookup
    if (apiKey) {
      try {
        // Step A: Validate sender address to obtain sender_address_code
        const senderValResp = await fetch("https://api.shipbubble.com/v1/shipping/address/validate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Swiftmart Central Hub",
            email: "logistics@swiftmart.ng",
            phone: "+2348012345678",
            address: `${sState}, Nigeria`,
          }),
        });

        const senderValData = await senderValResp.json();
        const senderAddressCode = senderValData?.data?.address_code;

        // Step B: Validate receiver address to obtain reciever_address_code
        const receiverValResp = await fetch("https://api.shipbubble.com/v1/shipping/address/validate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Customer Receiver",
            email: "orders@swiftmart.ng",
            phone: "+2348012345678",
            address: `${rAddr}, ${rCity}, ${rState}, Nigeria`,
          }),
        });

        const receiverValData = await receiverValResp.json();
        const receiverAddressCode = receiverValData?.data?.address_code;

        if (senderAddressCode && receiverAddressCode) {
          // Step C: Fetch real courier quotes using validated address codes
          const ratesResp = await fetch("https://api.shipbubble.com/v1/shipping/fetch_rates", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender_address_code: senderAddressCode,
              reciever_address_code: receiverAddressCode, // Shipbubble API schema uses reciever_address_code
              pickup_date: new Date().toISOString().split("T")[0],
              category_id: 90097994,
              package_items: [
                {
                  name: "Swiftmart Package",
                  description: "Customer Goods",
                  unit_weight: "1.0",
                  unit_amount: "5000",
                  quantity: String(itemsCount || 1),
                },
              ],
              package_dimension: { length: 15, width: 15, height: 10 },
            }),
          });

          if (ratesResp.ok) {
            const ratesData = await ratesResp.json();
            const couriers = ratesData?.data?.couriers || [];
            if (couriers.length > 0) {
              // Pick lowest available rate
              const cheapest = couriers
                .filter((c: any) => Number(c.total || c.rate_card_amount) > 0)
                .sort((a: any, b: any) => {
                  const rateA = Number(a.total || a.rate_card_amount);
                  const rateB = Number(b.total || b.rate_card_amount);
                  return rateA - rateB;
                })[0];

              if (cheapest) {
                const totalNaira = Number(cheapest.total || cheapest.rate_card_amount);
                baseCourierKobo = Math.round(totalNaira * 100);
                courierName = cheapest.courier_name || "Shipbubble Courier";
                isLiveQuote = true;
              }
            }
          } else {
            const errText = await ratesResp.text();
            console.warn("Shipbubble fetch_rates error:", errText);
          }
        } else {
          console.warn("Shipbubble address validation failed:", {
            senderErr: senderValData,
            receiverErr: receiverValData,
          });
        }
      } catch (sbErr) {
        console.warn("Shipbubble rate fetch exception:", sbErr);
      }
    }

    // 2. Fallback estimation if Shipbubble sandbox returned no quotes or key is missing
    if (!isLiveQuote || baseCourierKobo === 0) {
      const sLower = sState.toLowerCase();
      const rLower = rState.toLowerCase();
      if (sLower === rLower) {
        baseCourierKobo = sLower.includes("lagos") ? ZONE_RATES.lagos : ZONE_RATES.abuja;
      } else {
        baseCourierKobo = ZONE_RATES.interstate;
      }
      courierName = "SwiftMart Express Dispatch";
    }

    const totalShippingKobo = baseCourierKobo + SWIFTMART_PROFIT_KOBO;

    return new Response(
      JSON.stringify({
        success: true,
        isLiveQuote,
        courierName,
        baseCourierKobo,
        swiftmartProfitKobo: SWIFTMART_PROFIT_KOBO,
        totalShippingKobo,
        formattedTotal: `₦${(totalShippingKobo / 100).toLocaleString("en-NG")}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to calculate shipping" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
