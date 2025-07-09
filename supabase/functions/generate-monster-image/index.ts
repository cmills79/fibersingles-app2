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

    // Generate creative prompt from profile
    const prompt = generatePrompt(profile);
    console.log('Generated prompt:', prompt);

    // For now, let's use a placeholder service that works
    // This will test the full flow without Vertex AI complexity
    console.log('Using placeholder image generation for now...');
    
    // Create a colorful SVG based on the keywords
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const svgContent = `
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${randomColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.3" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <circle cx="150" cy="120" r="60" fill="url(#grad1)" stroke="#333" stroke-width="3"/>
        <circle cx="130" cy="105" r="8" fill="#000"/>
        <circle cx="170" cy="105" r="8" fill="#000"/>
        <ellipse cx="150" cy="130" rx="12" ry="8" fill="#333"/>
        <path d="M 130 150 Q 150 170 170 150" stroke="#333" stroke-width="3" fill="none"/>
        <text x="150" y="220" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle">Your Monster Friend</text>
        <text x="150" y="240" font-family="Arial, sans-serif" font-size="12" fill="#999" text-anchor="middle">${[...(profile.symptoms || []), ...(profile.coping || []), ...(profile.personality || [])].slice(0, 3).join(', ')}</text>
      </svg>
    `;

    const base64Svg = btoa(svgContent);
    const imageUrl = `data:image/svg+xml;base64,${base64Svg}`;

    console.log('Placeholder monster image generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        prompt: prompt,
        note: "This is a placeholder image. Vertex AI integration coming next!"
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