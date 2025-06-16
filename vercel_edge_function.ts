import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get caller number from query parameters
    const url = new URL(req.url)
    const callerNumber = url.searchParams.get('caller') || url.searchParams.get('phone')
    
    if (!callerNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number parameter missing' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Clean the phone number (remove spaces, +, etc.)
    const cleanedNumber = callerNumber.replace(/\D/g, '')

    // Look up the contact by extracting digits from ContactPhoneNumbers
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq(supabase.raw('regexp_replace("ContactPhoneNumbers", \'\\D\', \'\', \'g\')'), cleanedNumber)
      .single()

    // Determine the redirect URL based on whether contact was found
    let redirectUrl: string
    // REPLACE 'your-project' with your actual Vercel project name
    const baseUrl = 'https://your-project.vercel.app'
    
    if (contact && !error) {
      // Contact found - show contact details using ContactContactId as unique identifier
      redirectUrl = `${baseUrl}/contact-display.html?id=${contact.ContactContactId}`
    } else {
      // Contact not found - show form to add new contact
      redirectUrl = `${baseUrl}/contact-form.html?phone=${encodeURIComponent(callerNumber)}`
    }

    // Return redirect response
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})