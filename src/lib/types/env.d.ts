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

    SYSTEM_ACCESS_TOKEN: string;
    SESSION_SECRET: string;
    INTERNAL_API_URL?: string;

    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN?: string;

    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PUBLIC_URL: string;
    R2_BUCKET: string;

    TAVILY_API_KEY?: string;
    GUEST_API_KEY?: string;

    CREEM_API_KEY: string;
    CREEM_API_URL: string;
    CREEM_MODERATION_ENABLED: "0" | "1";

    GOOGLE_SITE_VERIFICATION?: string;

    STANDALONE?: string;
    PORT?: string;
  }
}
