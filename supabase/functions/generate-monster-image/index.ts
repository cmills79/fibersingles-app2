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
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', JSON.stringify(requestBody));
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid JSON in request body');
    }

    const { profile, userId }: GenerateImageRequest = requestBody;

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

    console.log('Profile validation passed');

    // Check environment variables
    const projectId = Deno.env.get('VERTEX_AI_PROJECT_ID');
    const location = Deno.env.get('VERTEX_AI_LOCATION');
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    console.log('Environment check:', {
      hasProjectId: !!projectId,
      hasLocation: !!location,
      hasServiceAccountKey: !!serviceAccountKey,
      projectId: projectId || 'not set',
      location: location || 'not set'
    });

    if (!projectId || !location || !serviceAccountKey) {
      throw new Error('Missing required environment variables');
    }

    // Test JSON parsing of service account key
    let serviceAccountData;
    try {
      serviceAccountData = JSON.parse(serviceAccountKey);
      console.log('Service account key parsed successfully:', {
        hasPrivateKey: !!serviceAccountData.private_key,
        hasClientEmail: !!serviceAccountData.client_email,
        projectId: serviceAccountData.project_id
      });
    } catch (error) {
      console.error('Error parsing service account key:', error);
      throw new Error('Invalid service account key JSON');
    }

    // Generate creative prompt from profile
    const prompt = generatePrompt(profile);
    console.log('Generated prompt:', prompt);

    // For now, return a mock response while we debug
    // TODO: Implement actual Vertex AI call once debugging is complete
    console.log('Returning mock response for debugging');
    
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmMGYwZjAiLz4gIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Nb25zdGVyIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==',
        prompt: prompt,
        debug: {
          environmentOk: true,
          serviceAccountOk: true,
          profileValid: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in monster image generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate monster image';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        debug: {
          errorType: errorType,
          timestamp: new Date().toISOString()
        }
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