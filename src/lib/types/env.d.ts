declare namespace NodeJS {
  export interface ProcessEnv {
    NEXT_PUBLIC_APP_NAME: string;
    NEXT_PUBLIC_URL: string;
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_SUPPORT_EMAIL: string;
    NEXT_PUBLIC_GITHUB_URL: string;

    SYSTEM_ACCESS_TOKEN: string;

    RESEND_FORWARD_TO: string;
    RESEND_FROM: string;
    RESEND_WEBHOOK_SECRET: string;

    STANDALONE?: string;
    PORT?: string;
  }
}
