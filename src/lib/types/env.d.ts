declare namespace NodeJS {
  export interface ProcessEnv {
    NEXT_PUBLIC_APP_NAME: string;
    NEXT_PUBLIC_URL: string;
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_SUPPORT_EMAIL: string;
    NEXT_PUBLIC_GITHUB_URL: string;
    NEXT_PUBLIC_DISCORD_URL?: string;
    NEXT_PUBLIC_TWITTER_HANDLE?: string;
    NEXT_PUBLIC_TRUSTPILOT_URL?: string;
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    NEXT_PUBLIC_POSTHOG_DISABLED?: string;

    SESSION_SECRET: string;
    INTERNAL_API_URL?: string;

    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN?: string;

    TAVILY_API_KEY?: string;
    LLM_STATS_API_KEY?: string;
    GUEST_API_KEY?: string;

    GOOGLE_SITE_VERIFICATION?: string;

    WEB_BOT_AUTH_PUBLIC_JWKS?: string;
    WEB_BOT_AUTH_PRIVATE_JWK?: string;

    STANDALONE?: string;
    PORT?: string;
  }
}
