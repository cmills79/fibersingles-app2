// supabase/functions/generate-monster-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Vertex AI configuration
const VERTEX_AI_PROJECT_ID = Deno.env.get('VERTEX_AI_PROJECT_ID') || 'fibersingles-app2';
const VERTEX_AI_LOCATION = Deno.env.get('VERTEX_AI_LOCATION') || 'us-central1';
const VERTEX_AI_MODEL = 'imagegeneration@006'; // Imagen 2 model

interface MonsterProfile {
  symptoms?: string[];
  coping?: string[];
  personality?: string[];
}

interface GenerateImageRequest {
  profile: MonsterProfile;
  userId: string;
}

// Helper function to convert PEM to DER format
function pemToDer(pem: string): ArrayBuffer {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(
    pem.indexOf(pemHeader) + pemHeader.length,
    pem.indexOf(pemFooter)
  ).trim();
  
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

// Helper function for base64url encoding
function base64UrlEncode(data: string | Uint8Array): string {
  let base64: string;
  
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const binaryString = Array.from(data, byte => String.fromCharCode(byte)).join('');
    base64 = btoa(binaryString);
  }
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper function to get access token for Vertex AI
async function getAccessToken(): Promise<string> {
  try {
    // Use the service account credentials from environment variable
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

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Import the private key
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToDer(serviceAccountKey.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the JWT
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureInput);
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      data
    );

    const jwt = `${signatureInput}.${base64UrlEncode(new Uint8Array(signature))}`;

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
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Generate creative prompt from monster profile
function generatePrompt(profile: MonsterProfile): string {
  let prompt = "Create a cute, friendly monster character that embodies: ";
  
  const attributes = [];
  
  // Add symptoms as monster features
  if (profile.symptoms && profile.symptoms.length > 0) {
    const symptomFeatures = profile.symptoms.slice(0, 3).map(symptom => {
      const mappings: Record<string, string> = {
        'fatigue': 'sleepy eyes and cozy appearance',
        'pain': 'soft, cushiony body with gentle features',
        'anxiety': 'alert, wide eyes with a comforting smile',
        'brain_fog': 'fluffy, cloud-like texture',
        'insomnia': 'night-themed with stars or moon patterns',
        'digestive_issues': 'round, balloon-like shape',
        'headaches': 'wearing a cute protective helmet or headband',
        'sensitivity': 'delicate, translucent features with soft colors',
        'dizziness': 'swirly patterns and playful wobbliness'
      };
      return mappings[symptom] || `features representing ${symptom}`;
    });
    attributes.push(...symptomFeatures);
  }
  
  // Add coping strategies as positive traits
  if (profile.coping && profile.coping.length > 0) {
    const copingTraits = profile.coping.slice(0, 3).map(strategy => {
      const mappings: Record<string, string> = {
        'rest': 'peaceful, zen-like demeanor',
        'gentle_exercise': 'dynamic pose with energy trails',
        'meditation': 'glowing aura of calmness',
        'hydration': 'water-themed elements like droplets or waves',
        'support_groups': 'multiple small companion creatures',
        'pacing': 'balanced, steady stance',
        'medication': 'healing crystals or magical elements',
        'therapy': 'wise, understanding expression',
        'diet_changes': 'holding healthy fruits or vegetables'
      };
      return mappings[strategy] || `showing ${strategy}`;
    });
    attributes.push(...copingTraits);
  }
  
  // Add personality traits
  if (profile.personality && profile.personality.length > 0) {
    const personalityTraits = profile.personality.slice(0, 3).map(trait => {
      const mappings: Record<string, string> = {
        'optimistic': 'bright, cheerful colors with upward-facing features',
        'resilient': 'strong, protective armor or shell',
        'empathetic': 'large, warm heart visible on chest',
        'creative': 'artistic tools or paintbrush tail',
        'determined': 'confident stance with cape or banner',
        'humorous': 'silly expressions and playful accessories',
        'introverted': 'cozy, wrapped in a blanket or shell',
        'analytical': 'wearing glasses with thoughtful expression',
        'compassionate': 'gentle hands reaching out to help'
      };
      return mappings[trait] || `expressing ${trait}`;
    });
    attributes.push(...personalityTraits);
  }
  
  prompt += attributes.join(", ");
  
  // Add style guidelines
  prompt += ". Cute and approachable design, soft pastel colors with vibrant accents, ";
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
    const { profile, userId }: GenerateImageRequest = await req.json();
    console.log('Received request for user:', userId);

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get access token for Vertex AI
    console.log('Getting access token for Vertex AI...');
    const accessToken = await getAccessToken();

    // Generate creative prompt from profile
    const prompt = generatePrompt(profile);
    console.log('Generated prompt:', prompt);

    // Prepare request for Vertex AI
    const vertexAIEndpoint = `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT_ID}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${VERTEX_AI_MODEL}:predict`;

    const requestBody = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1", // Square images for profile pictures
        safetyFilterLevel: "block_some",
        personGeneration: "dont_allow", // Avoid generating human faces
        addWatermark: false,
        seed: Math.floor(Math.random() * 100000), // Random seed for variety
      }
    };

    // Call Vertex AI
    console.log('Calling Vertex AI...');
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
      throw new Error('No image generated');
    }

    const imageBase64 = result.predictions[0].bytesBase64Encoded;
    if (!imageBase64) {
      throw new Error('No image data in response');
    }

    // Convert base64 to blob
    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageData], { type: 'image/png' });

    // Upload image to Supabase Storage
    const fileName = `${userId}/monster-${Date.now()}.png`;
    console.log('Uploading image to storage:', fileName);
    
    const { error: uploadError } = await supabase.storage
      .from('monster-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('monster-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        prompt: prompt
      }),
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
        error: error instanceof Error ? error.message : 'Failed to generate monster image'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});