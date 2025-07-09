// supabase/functions/generate-monster-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface MonsterProfile {
  symptoms?: string[];
  coping?: string[];
  personality?: string[];
}

interface GenerateImageRequest {
  profile: MonsterProfile;
  userId: string;
}

// Helper function to get access token for Vertex AI
async function getAccessToken(): Promise<string> {
  try {
    const serviceAccountKey = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')!);
    
    // Create JWT for Google OAuth2
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccountKey.private_key_id
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccountKey.client_email,
      sub: serviceAccountKey.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };

    // Create JWT signature
    const encoder = new TextEncoder();
    const data = encoder.encode(
      base64UrlEncode(JSON.stringify(header)) + '.' + 
      base64UrlEncode(JSON.stringify(payload))
    );

    // Import private key
    const privateKey = serviceAccountKey.private_key;
    const keyData = pemToDer(privateKey);
    
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      data
    );

    const jwt = 
      base64UrlEncode(JSON.stringify(header)) + '.' +
      base64UrlEncode(JSON.stringify(payload)) + '.' +
      base64UrlEncode(new Uint8Array(signature));

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Helper functions for JWT creation
function base64UrlEncode(data: string | Uint8Array): string {
  const base64 = typeof data === 'string' 
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToDer(pem: string): ArrayBuffer {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length
  ).replace(/\s/g, '');
  const binaryDer = atob(pemContents);
  const arrayBuffer = new ArrayBuffer(binaryDer.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryDer.length; i++) {
    uint8Array[i] = binaryDer.charCodeAt(i);
  }
  return arrayBuffer;
}

// Generate a creative prompt based on the monster profile
function generatePrompt(profile: MonsterProfile): string {
  const symptoms = profile.symptoms?.slice(0, 3) || [];
  const coping = profile.coping?.slice(0, 3) || [];
  const personality = profile.personality?.slice(0, 3) || [];

  let prompt = "A friendly, whimsical monster character in a vibrant fantasy art style. ";
  
  // Add personality traits
  if (personality.length > 0) {
    prompt += `The monster has a ${personality.join(', ')} personality. `;
  }

  // Transform symptoms into visual characteristics
  const visualTraits = symptoms.map(symptom => {
    const traitMap: Record<string, string> = {
      'fatigue': 'sleepy eyes with star-shaped pupils',
      'pain': 'glowing patches of healing light',
      'brain fog': 'a misty cloud crown',
      'sensitivity': 'iridescent, color-changing skin',
      'digestive': 'a belly that glows like a lava lamp',
      'mobility': 'floating or wings for easy movement',
      'mood': 'emotion-colored aura that shifts',
      'sleep': 'moon and star patterns on its body',
    };
    return traitMap[symptom.toLowerCase()] || `unique ${symptom}-inspired features`;
  });

  if (visualTraits.length > 0) {
    prompt += `It has ${visualTraits.join(', ')}. `;
  }

  // Add coping mechanisms as accessories or powers
  if (coping.length > 0) {
    const copingVisuals = coping.map(strategy => {
      const copingMap: Record<string, string> = {
        'meditation': 'surrounded by peaceful floating orbs',
        'exercise': 'athletic gear or energy ribbons',
        'creative': 'holding art supplies or musical notes',
        'nature': 'covered in flowers and leaves',
        'support': 'heart-shaped accessories',
        'routine': 'wearing a magical time-keeping device',
      };
      return copingMap[strategy.toLowerCase()] || `${strategy}-themed accessories`;
    });
    prompt += `The monster has ${copingVisuals.join(', ')}. `;
  }

  // Add style guidelines
  prompt += "Cute and approachable design, soft colors with vibrant accents, ";
  prompt += "in the style of a children's book illustration mixed with modern digital art. ";
  prompt += "Full body view, white background, highly detailed, magical and uplifting.";

  return prompt;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Monster image generation request received');
    
    const { profile, userId }: GenerateImageRequest = await req.json();

    if (!profile || !userId) {
      throw new Error('Missing required fields: profile and userId');
    }

    // Validate that at least one keyword is selected
    const hasKeywords = 
      (profile.symptoms?.length || 0) > 0 ||
      (profile.coping?.length || 0) > 0 ||
      (profile.personality?.length || 0) > 0;

    if (!hasKeywords) {
      throw new Error('At least one keyword must be selected');
    }

    // Check environment variables
    const projectId = Deno.env.get('VERTEX_AI_PROJECT_ID');
    const location = Deno.env.get('VERTEX_AI_LOCATION') || 'us-central1';
    
    if (!projectId) {
      throw new Error('VERTEX_AI_PROJECT_ID environment variable not set');
    }

    // Get access token for Vertex AI
    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    console.log('Access token obtained successfully');

    // Generate creative prompt from profile
    const prompt = generatePrompt(profile);
    console.log('Generated prompt:', prompt);

    // Prepare request for Vertex AI Imagen
    const vertexAIEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;

    const requestBody = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "dont_allow",
        addWatermark: false,
        seed: Math.floor(Math.random() * 100000),
      }
    };

    console.log('Calling Vertex AI Imagen...');
    
    // Call Vertex AI
    const response = await fetch(vertexAIEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI error:', errorText);
      throw new Error(`Vertex AI request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Vertex AI response received');

    // Extract the generated image
    if (!result.predictions || result.predictions.length === 0) {
      throw new Error('No image generated by Vertex AI');
    }

    const imageBase64 = result.predictions[0].bytesBase64Encoded;
    if (!imageBase64) {
      throw new Error('No image data in Vertex AI response');
    }

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: `data:image/png;base64,${imageBase64}`,
        prompt: prompt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating monster image:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate monster image'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

export type { MonsterProfile, GenerateImageRequest };