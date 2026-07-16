interface PublicEnvironment {
  supabasePublishableKey: string;
  supabaseUrl: string;
}

interface ServerEnvironment extends PublicEnvironment {
  embeddingWebhookSecret: string;
  openAiApiKey: string;
  supabaseServiceRoleKey: string;
}

interface SupabaseServiceRoleEnvironment extends PublicEnvironment {
  supabaseServiceRoleKey: string;
}

type RequiredEnvironmentVariable =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY"
  | "EMBEDDING_WEBHOOK_SECRET";

function getRequiredServerEnvironmentVariable(
  name: Exclude<
    RequiredEnvironmentVariable,
    "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  >,
) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPublicEnvironment(): PublicEnvironment {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing required public Supabase environment variables");
  }

  return {
    supabasePublishableKey,
    supabaseUrl,
  };
}

export function getServerEnvironment(): ServerEnvironment {
  return {
    ...getSupabaseServiceRoleEnvironment(),
    embeddingWebhookSecret: getRequiredServerEnvironmentVariable("EMBEDDING_WEBHOOK_SECRET"),
    openAiApiKey: getRequiredServerEnvironmentVariable("OPENAI_API_KEY"),
  };
}

export function getSupabaseServiceRoleEnvironment(): SupabaseServiceRoleEnvironment {
  return {
    ...getPublicEnvironment(),
    supabaseServiceRoleKey: getRequiredServerEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export const isProductionEnvironment = process.env.NODE_ENV === "production";
