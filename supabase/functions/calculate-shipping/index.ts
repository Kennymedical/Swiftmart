import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Swiftmart platform profit added to every delivery
const SWIFTMART_PROFIT_KOBO = 50000; // ₦500.00 profit markup

// Real-world Nigerian logistics benchmarks by region (in kobo)
// Base rates reflect standard motor-park waybill & regional dispatch averages
const REGION_MAP: Record<string, string> = {
  // South West
  lagos: "south_west",
  ogun: "south_west",
  oyo: "south_west",
  osun: "south_west",
  ondo: "south_west",
  ekiti: "south_west",

  // South East
  anambra: "south_east",
  enugu: "south_east",
  imo: "south_east",
  abia: "south_east",
  ebonyi: "south_east",

  // South South
  rivers: "south_south",
  delta: "south_south",
  edo: "south_south",
  "akwa ibom": "south_south",
  cross_river: "south_south",
  bayelsa: "south_south",

  // North Central & FCT
  abuja: "north_central",
  "abuja (fct)": "north_central",
  fct: "north_central",
  kogi: "north_central",
  kwara: "north_central",
  nasarawa: "north_central",
  niger: "north_central",
  plateau: "north_central",
  benue: "north_central",

  // North West & North East
  kano: "north_far",
  kaduna: "north_far",
  katsina: "north_far",
  sokoto: "north_far",
  kebbi: "north_far",
  zamfara: "north_far",
  jigawa: "north_far",
  bauchi: "north_far",
  borno: "north_far",
  gombe: "north_far",
  adamawa: "north_far",
  taraba: "north_far",
  yobe: "north_far",
};

function getBaseRateKobo(senderState: string, receiverState: string): { baseKobo: number; courierName: string; estDays: string } {
  const s = senderState.toLowerCase().trim();
  const r = receiverState.toLowerCase().trim();

  // 1. Same-state Intra-city delivery
  if (s === r) {
    if (s.includes("lagos")) {
      return { baseKobo: 200000, courierName: "SwiftMart Local Dispatch (Lagos)", estDays: "1-2 business days" }; // ₦2,000 base
    }
    if (s.includes("abuja") || s.includes("fct")) {
      return { baseKobo: 220000, courierName: "SwiftMart Local Dispatch (Abuja)", estDays: "1-2 business days" }; // ₦2,200 base
    }
    return { baseKobo: 180000, courierName: `SwiftMart Intra-State (${receiverState})`, estDays: "1-2 business days" }; // ₦1,800 base
  }

  const sRegion = REGION_MAP[s] || "south_west";
  const rRegion = REGION_MAP[r] || "south_west";

  // 2. Same region interstate (e.g. Lagos to Ogun/Oyo or Enugu to Anambra)
  if (sRegion === rRegion) {
    return { baseKobo: 300000, courierName: `SwiftMart Regional Waybill (${receiverState})`, estDays: "2-3 business days" }; // ₦3,000 base
  }

  // 3. Adjacent regions (e.g. South West to South South / South East)
  if (
    (sRegion === "south_west" && (rRegion === "south_east" || rRegion === "south_south")) ||
    ((sRegion === "south_east" || sRegion === "south_south") && rRegion === "south_west")
  ) {
    return { baseKobo: 380000, courierName: `SwiftMart Interstate Express (${receiverState})`, estDays: "2-4 business days" }; // ₦3,800 base
  }

  // 4. Far interstate (e.g. Lagos/South to Northern States or vice-versa)
  if (sRegion === "north_far" || rRegion === "north_far") {
    return { baseKobo: 450000, courierName: `SwiftMart Nationwide Waybill (${receiverState})`, estDays: "3-5 business days" }; // ₦4,500 base
  }

  // 5. Standard Interstate fallback
  return { baseKobo: 350000, courierName: `SwiftMart Interstate Delivery (${receiverState})`, estDays: "3-4 business days" }; // ₦3,500 base
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const senderState = (body.senderState || "Lagos").trim();
    const receiverState = (body.receiverState || "Lagos").trim();
    const receiverCity = (body.receiverCity || receiverState).trim();
    const itemsCount = Number(body.itemsCount) || 1;

    // Calculate base rate from realistic Nigerian logistics matrix
    const { baseKobo, courierName, estDays } = getBaseRateKobo(senderState, receiverState);

    // Multi-item small adjustment (₦200 per extra item for parcel size handling)
    const extraItemsFee = itemsCount > 1 ? (itemsCount - 1) * 20000 : 0;
    const finalBaseKobo = baseKobo + extraItemsFee;

    // Total = base delivery fee + ₦500 Swiftmart profit
    const totalShippingKobo = finalBaseKobo + SWIFTMART_PROFIT_KOBO;

    return new Response(
      JSON.stringify({
        success: true,
        courierName,
        estimatedDeliveryDays: estDays,
        baseCourierKobo: finalBaseKobo,
        swiftmartProfitKobo: SWIFTMART_PROFIT_KOBO,
        totalShippingKobo,
        formattedTotal: `₦${(totalShippingKobo / 100).toLocaleString("en-NG")}`,
        destinationSummary: `${receiverCity}, ${receiverState}`,
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
