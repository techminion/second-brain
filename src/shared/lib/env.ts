interface PublicEnvironment {
  supabaseAnonKey: string;
  supabaseUrl: string;
}

interface ServerEnvironment extends PublicEnvironment {
  embeddingWebhookSecret: string;
  openAiApiKey: string;
  supabaseServiceRoleKey: string;
}

type RequiredEnvironmentVariable =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY"
  | "EMBEDDING_WEBHOOK_SECRET";

function getRequiredEnvironmentVariable(name: RequiredEnvironmentVariable) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPublicEnvironment(): PublicEnvironment {
  return {
    supabaseAnonKey: getRequiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseUrl: getRequiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
  };
}

export function getServerEnvironment(): ServerEnvironment {
  return {
    ...getPublicEnvironment(),
    embeddingWebhookSecret: getRequiredEnvironmentVariable("EMBEDDING_WEBHOOK_SECRET"),
    openAiApiKey: getRequiredEnvironmentVariable("OPENAI_API_KEY"),
    supabaseServiceRoleKey: getRequiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export const isProductionEnvironment = process.env.NODE_ENV === "production";
