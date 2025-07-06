// supabase/functions/generate-monster-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Vertex AI configuration
const VERTEX_AI_PROJECT_ID = Deno.env.get('VERTEX_AI_PROJECT_ID');
const VERTEX_AI_LOCATION = Deno.env.get('VERTEX_AI_LOCATION');
const VERTEX_AI_MODEL = 'imagegeneration@006'; // Imagen 2 model

// Validate environment variables
if (!VERTEX_AI_PROJECT_ID || !VERTEX_AI_LOCATION) {
  console.error('Missing required environment variables');
  throw new Error('Missing required environment variables: VERTEX_AI_PROJECT_ID or VERTEX_AI_LOCATION');
}

// Configure logging
const log = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args)
};

// Valid symptom types
const VALID_SYMPTOMS = [
  'fatigue',
  'pain',
  'brain fog',
  'sensitivity',
  'digestive',
  'mobility',
  'mood',
  'sleep'
] as const;

// Valid coping strategies
const VALID_COPING = [
  'meditation',
  'exercise',
  'creative',
  'nature',
  'support',
  'routine'
] as const;

type Symptom = typeof VALID_SYMPTOMS[number];
type CopingStrategy = typeof VALID_COPING[number];

interface MonsterProfile {
  symptoms?: Symptom[];
  coping?: CopingStrategy[];
  personality?: string[];
  // Allow 1-5 traits of each type
  validate(): boolean {
    return (
      (!this.symptoms || (this.symptoms.length > 0 && this.symptoms.length <= 5)) &&
      (!this.coping || (this.coping.length > 0 && this.coping.length <= 5)) &&
      (!this.personality || (this.personality.length > 0 && this.personality.length <= 5))
    );
  }
}

interface GenerateImageRequest {
  profile: MonsterProfile;
  userId: string;
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

    // Import crypto for JWT signing
    const encoder = new TextEncoder();
    const data = encoder.encode(
      base64UrlEncode(JSON.stringify(header)) + '.' + 
      base64UrlEncode(JSON.stringify(payload))
    );

    // Sign the JWT
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToDer(serviceAccountKey.private_key),
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
      throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
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
    pem.length - pemFooter.length - 1
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

  // Create a whimsical, non-medical description
  let prompt = "A friendly, whimsical monster character in a vibrant fantasy art style. ";
  
  // Add personality traits
  if (personality.length > 0) {
    prompt += `The monster has a ${personality.join(', ')} personality. `;
  }

  // Transform symptoms into visual characteristics
  const visualTraits = symptoms.map(symptom => {
    // Map symptoms to visual traits in a non-medical way
    const traitMap: Record<string, string> = {
      'fatigue': 'sleepy eyes with star-shaped pupils',
      'pain': 'glowing patches of healing light',
      'brain fog': 'a misty cloud crown',
      'sensitivity': 'iridescent, color-changing skin',
      'digestive': 'a belly that glows like a lava lamp',
      'mobility': 'floating or wings for easy movement',
      'mood': 'emotion-colored aura that shifts',
      'sleep': 'moon and star patterns on its body',
      // Add more mappings as needed
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
        // Add more mappings
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
    // Log incoming request
    log.debug('Incoming request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    // Parse request body
    const rawBody = await req.text();
    log.debug('Raw request body:', rawBody);
    
    let requestData: GenerateImageRequest;
    try {
      requestData = JSON.parse(rawBody);
    } catch (e) {
      throw new Error(`Invalid JSON in request body: ${e.message}`);
    }
    
    const { profile, userId } = requestData;

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

    // Get access token for Vertex AI
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
    log.debug('Calling Vertex AI:', {
      endpoint: vertexAIEndpoint,
      requestBody: {
        ...requestBody,
        accessToken: '***' // Hide sensitive data in logs
      }
    });

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
      log.error('Vertex AI error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Vertex AI request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

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

    // Here you would typically:
    // 1. Upload the image to Supabase Storage
    // 2. Save the URL to the user's profile
    // For now, we'll return the base64 image

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: `data:image/png;base64,${imageBase64}`,
        prompt: prompt // For debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    log.error('Error in monster generation:', {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate monster image',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Export type definitions for frontend use
export type { MonsterProfile, GenerateImageRequest };