import type { RpEntityKind } from "@/lib/db/schema/client";
import { posthog } from "@/lib/posthog-lazy";

type RpAnalyticsEntity =
  Exclude<RpEntityKind, "conversations"> | "lorebook_entries";

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
  registerFailed: (props: { reason: string }) => {
    posthog.capture("auth_register_failed", { reason: props.reason });
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
  streamCompleted: (props: {
    model: string;
    is_first_message: boolean;
    is_rp: boolean;
    character_count: number;
    has_persona: boolean;
    has_lorebook: boolean;
    has_preset: boolean;
  }) => {
    posthog.capture("chat_stream_completed", {
      model: props.model,
      is_first_message: props.is_first_message,
      is_rp: props.is_rp,
      character_count: props.character_count,
      has_persona: props.has_persona,
      has_lorebook: props.has_lorebook,
      has_preset: props.has_preset,
    });
  },
  streamFailed: (props: {
    error_type: string;
    status: number | null;
    code: string | null;
    model?: string;
    request_id?: string | null;
    message?: string;
  }) => {
    posthog.capture("chat_stream_failed", {
      error_type: props.error_type,
      status: props.status,
      code: props.code,
      model: props.model,
      request_id: props.request_id ?? null,
      message: props.message,
    });
  },
  modelAutoPicked: (props: { to: string }) => {
    posthog.capture("chat_model_auto_picked", { to_model: props.to });
  },
  // Rerolling for a better response - the strongest RP engagement signal.
  messageSwiped: (props: { direction: "prev" | "next"; is_rp: boolean }) => {
    posthog.capture("chat_message_swiped", {
      direction: props.direction,
      is_rp: props.is_rp,
    });
  },
  messageRegenerated: (props: { is_rp: boolean }) => {
    posthog.capture("chat_message_regenerated", { is_rp: props.is_rp });
  },
  messageEdited: (props: { role: "user" | "assistant"; is_rp: boolean }) => {
    posthog.capture("chat_message_edited", {
      role: props.role,
      is_rp: props.is_rp,
    });
  },
  conversationBranched: (props: { is_rp: boolean }) => {
    posthog.capture("chat_conversation_branched", { is_rp: props.is_rp });
  },
  // Multi-character turn actually rotated (serious RP, not casual chat).
  groupTurn: (props: { character_count: number }) => {
    posthog.capture("chat_group_turn", {
      character_count: props.character_count,
    });
  },
  autoContinued: (props: { step: number }) => {
    posthog.capture("chat_auto_continued", { step: props.step });
  },
  greetingPicked: (props: { index: number }) => {
    posthog.capture("chat_greeting_picked", { index: props.index });
  },
  // Flagship RP feature: in-chat illustration produced by the illustrator agent.
  imageGenerated: (props: { source: "auto" | "regenerate"; model: string }) => {
    posthog.capture("chat_image_generated", {
      source: props.source,
      model: props.model,
    });
  },
  // Long-session RP proxy: the rolling-summary memory folded a chunk this turn.
  memoryFolded: () => {
    posthog.capture("chat_memory_folded");
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
    group_pinned: boolean;
    group_count: number;
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
    group_pinned: boolean;
    group_count: number;
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
  apiReferenceOpened: () => {
    posthog.capture("settings_api_reference_opened");
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
  guideViewed: (props: { slug: string }) => {
    posthog.capture("docs_guide_viewed", { slug: props.slug });
  },
};

const models = {
  detailOpened: (props: { model: string }) => {
    posthog.capture("models_detail_opened", { model: props.model });
  },
  searched: (props: { query_length: number; has_results: boolean }) => {
    posthog.capture("models_searched", {
      query_length: props.query_length,
      has_results: props.has_results,
    });
  },
  compareAdded: (props: { model: string }) => {
    posthog.capture("models_compare_added", { model: props.model });
  },
  openInChat: (props: { model: string }) => {
    posthog.capture("models_open_in_chat", { model: props.model });
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
  models,
  rp,
  content,
} as const;
