declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }

  export const env: Env;

  export interface ConnInfo {
    localAddr: Addr;
    remoteAddr: Addr;
  }

  export interface Addr {
    transport: 'tcp' | 'udp';
    hostname: string;
    port: number;
  }

  export interface RequestEvent {
    request: Request;
    respondWith(r: Response | Promise<Response>): Promise<void>;
  }

  export interface WebSocketEvent {
    websocket: WebSocket;
    response: Response;
  }

  // Crypto types for JWT handling
  export interface SubtleCrypto {
    importKey(
      format: 'pkcs8' | 'spki' | 'jwk' | 'raw',
      keyData: ArrayBuffer | JsonWebKey,
      algorithm: string | Algorithm | RsaHashedImportParams | EcKeyImportParams,
      extractable: boolean,
      keyUsages: KeyUsage[]
    ): Promise<CryptoKey>;

    sign(
      algorithm: string | Algorithm | RsaHashedImportParams | EcKeyImportParams,
      key: CryptoKey,
      data: ArrayBuffer | ArrayBufferView
    ): Promise<ArrayBuffer>;
  }

  export interface Crypto {
    subtle: SubtleCrypto;
  }

  export const crypto: Crypto;
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
