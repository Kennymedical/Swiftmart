import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { email, otp } = await req.json()

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: "SwiftMart <security@yourdomain.com>", // You must verify a domain on Resend, or use onboarding@resend.dev for testing
      to: [email],
      subject: "Your SwiftMart Security Code",
      html: `<strong>Your 10-minute PIN reset code is: <h1>${otp}</h1></strong>`
    })
  })
  
  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
})
