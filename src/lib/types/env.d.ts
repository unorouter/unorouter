declare namespace NodeJS {
  export interface ProcessEnv {
    NEXT_PUBLIC_URL: string;
    NEXT_PUBLIC_APP_NAME: string;
    STANDALONE?: string;
  }
}
