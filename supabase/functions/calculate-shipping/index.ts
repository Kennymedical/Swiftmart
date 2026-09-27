import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SWIFTMART_PROFIT_KOBO = 50000; // ₦500.00 profit

// Nigerian regional zone fallback rates (base kobo)
const ZONE_RATES: Record<string, number> = {
  lagos: 200000,      // ₦2,000 base
  abuja: 250000,      // ₦2,500 base
  interstate: 350000, // ₦3,500 base
  far_distance: 500000 // ₦5,000 base
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { senderState, receiverState, receiverCity, itemsCount } = await req.json();
    const apiKey = Deno.env.get("SHIPBUBBLE_API_KEY");

    let baseCourierKobo = 250000; // Default ₦2,500 base
    let courierName = "SwiftMart Express Dispatch";

    const sState = (senderState || "Lagos").toLowerCase().trim();
    const rState = (receiverState || "Lagos").toLowerCase().trim();

    // 1. Try Shipbubble API if key is present
    if (apiKey) {
      try {
        const response = await fetch("https://api.shipbubble.com/v1/shipping/fetch_rates", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pickup_date: new Date().toISOString().split("T")[0],
            category_id: 90097994, // Standard Accessories / Goods
            package_items: [
              {
                name: "Swiftmart Package",
                description: "Customer Order Goods",
                unit_weight: "1.0",
                unit_amount: "5000",
                quantity: String(itemsCount || 1),
              },
            ],
            package_dimension: { length: 15, width: 15, height: 10 },
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          const couriers = resData?.data?.couriers || [];
          if (couriers.length > 0) {
            // Find cheapest courier rate
            const cheapest = couriers.sort((a: any, b: any) => (a.total || 0) - (b.total || 0))[0];
            if (cheapest?.total) {
              baseCourierKobo = Math.round(Number(cheapest.total) * 100);
              courierName = cheapest.courier_name || "Shipbubble Partner Courier";
            }
          }
        }
      } catch (sbErr) {
        console.warn("Shipbubble live quote fallback:", sbErr);
      }
    }

    // 2. Fallback smart route matrix if Shipbubble key unset or sandbox returns no quote
    if (baseCourierKobo === 250000) {
      if (sState === rState) {
        baseCourierKobo = sState === "lagos" ? ZONE_RATES.lagos : ZONE_RATES.abuja;
      } else {
        baseCourierKobo = ZONE_RATES.interstate;
      }
    }

    const totalShippingKobo = baseCourierKobo + SWIFTMART_PROFIT_KOBO;

    return new Response(
      JSON.stringify({
        success: true,
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
