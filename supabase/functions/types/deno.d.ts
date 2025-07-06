// Extend Deno namespace for missing types
declare namespace Deno {
  export interface RequestEvent {
    request: Request;
    respondWith(r: Response | Promise<Response>): Promise<void>;
  }

  export interface WebSocketEvent {
    websocket: WebSocket;
    response: Response;
  }
}

// Additional type definitions for your monster generation
interface MonsterGenerationConfig {
  projectId: string;
  location: string;
  model: string;
  safetySettings: {
    level: 'block_none' | 'block_some' | 'block_most';
    categories: string[];
  };
}

interface VertexAIResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

// Environment variable types
interface EdgeFunctionEnv {
  VERTEX_AI_PROJECT_ID: string;
  VERTEX_AI_LOCATION: string;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}
