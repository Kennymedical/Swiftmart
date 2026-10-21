import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TERMII_API_KEY = Deno.env.get('TERMII_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const { email, otp } = await req.json()
    if (!email || !otp) throw new Error("Email and OTP required")

    // 1. Connect to Supabase to find the user's phone number
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // Find user by email in auth.users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) throw userError
    const user = users.find(u => u.email === email)
    if (!user) throw new Error("User not found")

    // Get phone number from profiles
    const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).single()
    const phone = profile?.phone

    if (!phone) throw new Error("No phone number linked to this account")

    // 2. Send SMS via Termii
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        from: "SwiftMart", 
        sms: `Your SwiftMart security code is: ${otp}. Do not share this with anyone.`,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      }),
    })
    
    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { ...headers, "Content-Type": "application/json" } })
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...headers, "Content-Type": "application/json" }, status: 400 })
  }
})
