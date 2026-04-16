declare namespace NodeJS {
  export interface ProcessEnv {
    NEXT_PUBLIC_APP_NAME: string;
    NEXT_PUBLIC_URL: string;
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_SUPPORT_EMAIL: string;
    NEXT_PUBLIC_GITHUB_URL: string;

    SYSTEM_ACCESS_TOKEN: string;

    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN?: string;

    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PUBLIC_URL: string;

    TAVILY_API_KEY?: string;

    GOOGLE_SITE_VERIFICATION?: string;

    STANDALONE?: string;
    PORT?: string;
  }
}
