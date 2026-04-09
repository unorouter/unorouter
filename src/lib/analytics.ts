import posthog from "posthog-js";

const auth = {
  loginCompleted: (method: "email" | "oauth") => {
    posthog.capture("auth_login_completed", { method });
  },
  registerCompleted: () => {
    posthog.capture("auth_register_completed");
  },
  logoutCompleted: () => {
    posthog.capture("auth_logout_completed");
  },
  twoFAVerified: () => {
    posthog.capture("auth_2fa_verified");
  },
  oauthInitiated: (provider: string) => {
    posthog.capture("auth_oauth_initiated", { provider });
  },
  verificationSent: () => {
    posthog.capture("auth_verification_sent");
  },
};

const chat = {
  messageSent: (props: {
    conversationId: string;
    model: string;
    webSearch: boolean;
    isNewConversation: boolean;
  }) => {
    posthog.capture("chat_message_sent", {
      conversation_id: props.conversationId,
      model: props.model,
      web_search: props.webSearch,
      is_new_conversation: props.isNewConversation,
    });
  },
  modelChanged: (props: { from: string | null; to: string }) => {
    posthog.capture("chat_model_changed", {
      from_model: props.from,
      to_model: props.to,
    });
  },
  webSearchToggled: (enabled: boolean) => {
    posthog.capture("chat_web_search_toggled", { enabled });
  },
  conversationDeleted: (conversationId: string) => {
    posthog.capture("chat_conversation_deleted", {
      conversation_id: conversationId,
    });
  },
  conversationShared: (conversationId: string) => {
    posthog.capture("chat_conversation_shared", {
      conversation_id: conversationId,
    });
  },
  shareRevoked: (conversationId: string) => {
    posthog.capture("chat_share_revoked", {
      conversation_id: conversationId,
    });
  },
  conversationRenamed: (conversationId: string) => {
    posthog.capture("chat_conversation_renamed", {
      conversation_id: conversationId,
    });
  },
  shareLinkCopied: () => {
    posthog.capture("chat_share_link_copied");
  },
};

const billing = {
  topUpInitiated: (props: { provider: "stripe" | "creem"; amount?: number }) => {
    posthog.capture("billing_topup_initiated", {
      provider: props.provider,
      amount: props.amount,
    });
  },
  subscriptionInitiated: (props: {
    planId: string;
    provider: "stripe" | "creem";
  }) => {
    posthog.capture("billing_subscription_initiated", {
      plan_id: props.planId,
      provider: props.provider,
    });
  },
  preferenceUpdated: (preference: string) => {
    posthog.capture("billing_preference_updated", { preference });
  },
};

const tokens = {
  created: () => {
    posthog.capture("token_created");
  },
  deleted: () => {
    posthog.capture("token_deleted");
  },
  updated: () => {
    posthog.capture("token_updated");
  },
  statusToggled: (enabled: boolean) => {
    posthog.capture("token_status_toggled", { enabled });
  },
  keyRevealed: () => {
    posthog.capture("token_key_revealed");
  },
  keyCopied: () => {
    posthog.capture("token_key_copied");
  },
};

const settings = {
  themeChanged: (theme: string) => {
    posthog.capture("settings_theme_changed", { theme });
  },
  twoFAEnabled: () => {
    posthog.capture("settings_2fa_enabled");
  },
  twoFADisabled: () => {
    posthog.capture("settings_2fa_disabled");
  },
  passkeyRegistered: () => {
    posthog.capture("settings_passkey_registered");
  },
  passkeyDeleted: () => {
    posthog.capture("settings_passkey_deleted");
  },
  emailBound: () => {
    posthog.capture("settings_email_bound");
  },
  passwordChanged: () => {
    posthog.capture("settings_password_changed");
  },
  accountDeleted: () => {
    posthog.capture("settings_account_deleted");
  },
  accessTokenGenerated: () => {
    posthog.capture("settings_access_token_generated");
  },
  oauthBound: (provider: string) => {
    posthog.capture("settings_oauth_bound", { provider });
  },
};

const navigation = {
  sidebarToggled: (open: boolean) => {
    posthog.capture("nav_sidebar_toggled", { open });
  },
  docsSearchOpened: () => {
    posthog.capture("nav_docs_search_opened");
  },
  docsSearchResultSelected: (slug: string) => {
    posthog.capture("nav_docs_search_result_selected", { slug });
  },
};

const affiliate = {
  quotaTransferred: (amount: number) => {
    posthog.capture("affiliate_quota_transferred", { amount });
  },
  linkCopied: () => {
    posthog.capture("affiliate_link_copied");
  },
  codeCopied: () => {
    posthog.capture("affiliate_code_copied");
  },
};

const errors = {
  clientError: (props: {
    message: string;
    location: string;
    digest?: string;
  }) => {
    posthog.capture("client_error_occurred", {
      error_message: props.message,
      error_location: props.location,
      error_digest: props.digest,
    });
  },
};

export const analytics = {
  auth,
  chat,
  billing,
  tokens,
  settings,
  navigation,
  affiliate,
  errors,
} as const;
