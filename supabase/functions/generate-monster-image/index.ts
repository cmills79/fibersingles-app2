import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonsterProfile {
  symptoms: string[];
  coping: string[];
  personality: string[];
}

// This function generates the creative prompt that will be sent to the AI
function generatePrompt(profile: MonsterProfile): string {
  let prompt = "A cute, friendly, lovable monster character that embodies: ";
  const attributes = [
    ...(profile.symptoms || []),
    ...(profile.coping || []),
    ...(profile.personality || [])
  ];
  prompt += attributes.join(", ");
  prompt += ". Studio Ghibli style, soft lighting, vibrant, high-detail, white background, full body view.";
  return prompt;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profile, userId } = await req.json();
    if (!profile || !userId) {
      throw new Error('Missing required fields: profile and userId');
    }

    // Get the proxy URL and secret from Supabase environment variables
    const proxyUrl = Deno.env.get('VERTEX_AI_PROXY_URL');
    const proxySecret = Deno.env.get('VERTEX_AI_PROXY_SECRET');

    if (!proxyUrl || !proxySecret) {
      throw new Error('Proxy is not configured. Set secrets in Supabase dashboard.');
    }

    // Generate the text prompt from the user's selections
    const prompt = generatePrompt(profile);
    console.log(`Generated prompt for user ${userId}: ${prompt}`);

    // Call your Google Cloud Run proxy
    const response = await fetch(`${proxyUrl}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${proxySecret}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (!data.success || !data.imageUrl) {
      throw new Error('Proxy did not return a valid image URL.');
    }

    // Return the successful response to your application
    return new Response(
      JSON.stringify({ success: true, imageUrl: data.imageUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-monster-image function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});