import type { RpSyncKind } from "@/lib/validation/sync";
import { posthog } from "@/lib/posthog-lazy";

// Conversations report through the `chat.*` events; lorebook entries are a
// sub-entity with no sync kind of their own.
type RpAnalyticsEntity =
  | Exclude<RpSyncKind, "conversations">
  | "lorebook_entries";

type RpAnalyticsAction =
  | "create_started"
  | "edit_started"
  | "deleted"
  | "import_picker_opened"
  | "imported"
  | "import_failed"
  | "exported";

const auth = {
  loginCompleted: (method: "email" | "oauth") => {
    posthog.capture("auth_login_completed", { method });
  },
  registerCompleted: () => {
    posthog.capture("auth_register_completed");
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
  modelChanged: (props: { from: string | null; to: string }) => {
    posthog.capture("chat_model_changed", {
      from_model: props.from,
      to_model: props.to,
    });
  },
  webSearchToggled: (enabled: boolean) => {
    posthog.capture("chat_web_search_toggled", { enabled });
  },
  conversationRenameStarted: () => {
    posthog.capture("chat_conversation_rename_started");
  },
  conversationRenameCancelled: () => {
    posthog.capture("chat_conversation_rename_cancelled");
  },
  conversationSelected: (props: { from: "list" | "popover" }) => {
    posthog.capture("chat_conversation_selected", { from: props.from });
  },
  conversationListSearched: (props: {
    query_length: number;
    has_results: boolean;
  }) => {
    posthog.capture("chat_conversation_list_searched", {
      query_length: props.query_length,
      has_results: props.has_results,
    });
  },
  conversationListPaginated: () => {
    posthog.capture("chat_conversation_list_paginated");
  },
  conversationExported: (props: {
    format: "native" | "orpg" | "sillytavern";
  }) => {
    posthog.capture("chat_conversation_exported", { format: props.format });
  },
  conversationExportFailed: (props: {
    format: "native" | "orpg" | "sillytavern";
  }) => {
    posthog.capture("chat_conversation_export_failed", {
      format: props.format,
    });
  },
  importPickerOpened: () => {
    posthog.capture("chat_import_picker_opened");
  },
  conversationImported: () => {
    posthog.capture("chat_conversation_imported");
  },
  markdownCopied: (props: { char_count: number }) => {
    posthog.capture("chat_markdown_copied", { char_count: props.char_count });
  },
  conversationDuplicated: () => {
    posthog.capture("chat_conversation_duplicated");
  },
  conversationCleared: () => {
    posthog.capture("chat_conversation_cleared");
  },
  clearConfirmOpened: () => {
    posthog.capture("chat_clear_confirm_opened");
  },
  overridesDrawerOpened: (props: { mode: "defaults" | "conversation" }) => {
    posthog.capture("chat_overrides_drawer_opened", { mode: props.mode });
  },
  overridesSaved: (props: {
    mode: "defaults" | "conversation";
    changed_fields: string[];
    has_persona: boolean;
    has_preset: boolean;
    character_count: number;
    lorebook_count: number;
    has_system_prompt: boolean;
    has_author_note: boolean;
    reasoning_effort: string | null;
    web_search_enabled: boolean;
    web_search_engine: string | null;
    sampling_customized_fields: string[];
  }) => {
    posthog.capture("chat_overrides_saved", props);
  },
};

const billing = {
  topUpInitiated: (props: {
    provider: "stripe" | "creem" | "nowpayments";
    amount?: number;
    has_discount?: boolean;
    discount_pct?: number;
  }) => {
    posthog.capture("billing_topup_initiated", {
      provider: props.provider,
      amount: props.amount,
      has_discount: props.has_discount,
      discount_pct: props.discount_pct,
    });
  },
  subscriptionInitiated: (props: {
    planId: string;
    provider: "stripe" | "creem" | "nowpayments";
    provider_was_only_option: boolean;
  }) => {
    posthog.capture("billing_subscription_initiated", {
      plan_id: props.planId,
      provider: props.provider,
      provider_was_only_option: props.provider_was_only_option,
    });
  },
  preferenceUpdated: (preference: string) => {
    posthog.capture("billing_preference_updated", { preference });
  },
  portalOpened: () => {
    posthog.capture("billing_portal_opened");
  },
  refreshed: () => {
    posthog.capture("billing_refreshed");
  },
};

const tokens = {
  created: (props: {
    has_ip_whitelist: boolean;
    unlimited_quota: boolean;
    model_limits_enabled: boolean;
    model_count: number;
  }) => {
    posthog.capture("token_created", props);
  },
  deleted: () => {
    posthog.capture("token_deleted");
  },
  updated: (props: {
    has_ip_whitelist: boolean;
    unlimited_quota: boolean;
    model_limits_enabled: boolean;
    model_count: number;
  }) => {
    posthog.capture("token_updated", props);
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
  quotaPresetClicked: (props: { amount: number }) => {
    posthog.capture("token_quota_preset_clicked", { amount: props.amount });
  },
};

const settings = {
  themeChanged: (theme: string) => {
    posthog.capture("settings_theme_changed", { theme });
  },
  localeChanged: (locale: string) => {
    posthog.capture("settings_locale_changed", { locale });
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
  oauthUnbound: (provider: string) => {
    posthog.capture("settings_oauth_unbound", { provider });
  },
  notificationChannelChanged: (method: string) => {
    posthog.capture("settings_notification_channel_changed", { method });
  },
  notificationSaved: (props: {
    method: string;
    quota_threshold_dollars: number;
  }) => {
    posthog.capture("settings_notification_saved", props);
  },
};

const navigation = {
  sidebarToggled: (open: boolean) => {
    posthog.capture("nav_sidebar_toggled", { open });
  },
  topLinkClicked: (props: { name: string; from_route: string }) => {
    posthog.capture("nav_top_link_clicked", props);
  },
  docsSubmenuLinkClicked: (props: { name: string }) => {
    posthog.capture("nav_docs_submenu_link_clicked", { name: props.name });
  },
  footerLinkClicked: (props: { key: string; external: boolean }) => {
    posthog.capture("nav_footer_link_clicked", props);
  },
  socialClicked: (platform: string) => {
    posthog.capture("nav_social_clicked", { platform });
  },
  supportEmailClicked: () => {
    posthog.capture("nav_support_email_clicked");
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
  transferDialogOpened: () => {
    posthog.capture("affiliate_transfer_dialog_opened");
  },
  tabChanged: (props: { tab: string }) => {
    posthog.capture("affiliate_tab_changed", { tab: props.tab });
  },
};

const dashboard = {
  chartTabChanged: (props: { tab: string }) => {
    posthog.capture("dashboard_chart_tab_changed", { tab: props.tab });
  },
  dateRangeChanged: (props: { period_minutes: number }) => {
    posthog.capture("dashboard_date_range_changed", {
      period_minutes: props.period_minutes,
    });
  },
  dateRangeReset: () => {
    posthog.capture("dashboard_date_range_reset");
  },
  refreshed: () => {
    posthog.capture("dashboard_refreshed");
  },
  uptimeCategoryChanged: (props: { category: string }) => {
    posthog.capture("dashboard_uptime_category_changed", {
      category: props.category,
    });
  },
  faqExpanded: (props: { index: number }) => {
    posthog.capture("dashboard_faq_expanded", { index: props.index });
  },
};

const logs = {
  filterChanged: (props: { filter_id: string; has_value: boolean }) => {
    posthog.capture("logs_filter_changed", props);
  },
  filtersReset: () => {
    posthog.capture("logs_filters_reset");
  },
  refreshed: () => {
    posthog.capture("logs_refreshed");
  },
  modelNameCopied: () => {
    posthog.capture("logs_model_name_copied");
  },
  tokenNameCopied: () => {
    posthog.capture("logs_token_name_copied");
  },
};

const docs = {
  osTabChanged: (props: { os: string }) => {
    posthog.capture("docs_os_tab_changed", { os: props.os });
  },
};

const rp = {
  entityAction: (props: {
    entity: RpAnalyticsEntity;
    action: RpAnalyticsAction;
    format?: string;
    is_default?: boolean;
  }) => {
    posthog.capture("rp_entity_action", props);
  },
};

const easterEgg = {
  breakoutOpened: (props: { from_route: string }) => {
    posthog.capture("easter_egg_breakout_opened", {
      from_route: props.from_route,
    });
  },
  breakoutLoaded: () => {
    posthog.capture("easter_egg_breakout_loaded");
  },
  breakoutClosed: (props: {
    duration_ms: number;
    final_score: number;
    max_level: number;
    reached_game_over: boolean;
  }) => {
    posthog.capture("easter_egg_breakout_closed", props);
  },
  breakoutLevelCleared: (props: { level: number; score: number }) => {
    posthog.capture("easter_egg_breakout_level_cleared", props);
  },
  breakoutGameOver: (props: { score: number; level: number }) => {
    posthog.capture("easter_egg_breakout_game_over", props);
  },
  breakoutNewBest: (props: { score: number }) => {
    posthog.capture("easter_egg_breakout_new_best", { score: props.score });
  },
};

const content = {
  copied: (props: { label: string }) => {
    posthog.capture("content_copied", { label: props.label });
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
  dashboard,
  logs,
  docs,
  rp,
  easterEgg,
  content,
} as const;
