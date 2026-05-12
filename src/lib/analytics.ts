import posthog from "posthog-js";

const auth = {
  loginCompleted: (method: "email" | "oauth") => {
    posthog.capture("auth_login_completed", { method });
  },
  loginFailed: (props: { reason: string }) => {
    posthog.capture("auth_login_failed", { reason: props.reason });
  },
  registerCompleted: () => {
    posthog.capture("auth_register_completed");
  },
  registerFailed: (props: { reason: string }) => {
    posthog.capture("auth_register_failed", { reason: props.reason });
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
  oauthFailed: (props: { provider: string; reason: string }) => {
    posthog.capture("auth_oauth_failed", {
      provider: props.provider,
      reason: props.reason,
    });
  },
  verificationSent: () => {
    posthog.capture("auth_verification_sent");
  },
  turnstileVerified: () => {
    posthog.capture("auth_turnstile_verified");
  },
  turnstileFailed: () => {
    posthog.capture("auth_turnstile_failed");
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
  messageCopied: () => {
    posthog.capture("chat_message_copied");
  },
  messageRegenerated: () => {
    posthog.capture("chat_message_regenerated");
  },
  messageEditStarted: (props: { role: "user" | "assistant" }) => {
    posthog.capture("chat_message_edit_started", { role: props.role });
  },
  messageDeleteArmed: () => {
    posthog.capture("chat_message_delete_armed");
  },
  messageDeleteConfirmed: () => {
    posthog.capture("chat_message_delete_confirmed");
  },
  generationCancelled: () => {
    posthog.capture("chat_generation_cancelled");
  },
  branchNavigated: (props: { direction: "previous" | "next" }) => {
    posthog.capture("chat_branch_navigated", { direction: props.direction });
  },
  scrollToBottomClicked: () => {
    posthog.capture("chat_scroll_to_bottom_clicked");
  },
  suggestedPromptClicked: () => {
    posthog.capture("chat_suggested_prompt_clicked");
  },
  attachmentPickerOpened: () => {
    posthog.capture("chat_attachment_picker_opened");
  },
  attachmentAdded: (props: {
    source: "picker" | "drop" | "paste";
    mime?: string;
  }) => {
    posthog.capture("chat_attachment_added", {
      source: props.source,
      mime: props.mime,
    });
  },
  attachmentRemoved: () => {
    posthog.capture("chat_attachment_removed");
  },
  attachmentPreviewOpened: () => {
    posthog.capture("chat_attachment_preview_opened");
  },
  reasoningPanelToggled: (open: boolean) => {
    posthog.capture("chat_reasoning_panel_toggled", { open });
  },
  toolResultToggled: (props: { tool_name: string; open: boolean }) => {
    posthog.capture("chat_tool_result_toggled", {
      tool_name: props.tool_name,
      open: props.open,
    });
  },
  taskRefreshClicked: () => {
    posthog.capture("chat_task_refresh_clicked");
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
  shareLinkCopied: () => {
    posthog.capture("chat_share_link_copied");
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
  samplingReset: () => {
    posthog.capture("chat_sampling_reset");
  },
};

const billing = {
  topUpInitiated: (props: {
    provider: "stripe" | "creem";
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
    provider: "stripe" | "creem";
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
  docsSearchOpened: () => {
    posthog.capture("nav_docs_search_opened");
  },
  docsSearchResultSelected: (slug: string) => {
    posthog.capture("nav_docs_search_result_selected", { slug });
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
  requestIdCopied: () => {
    posthog.capture("logs_request_id_copied");
  },
};

const docs = {
  osTabChanged: (props: { os: string }) => {
    posthog.capture("docs_os_tab_changed", { os: props.os });
  },
};

const rp = {
  entityAction: (props: {
    entity: "character" | "persona" | "lorebook" | "preset" | "lorebook_entry";
    action:
      | "create_started"
      | "edit_started"
      | "deleted"
      | "import_picker_opened"
      | "imported"
      | "import_failed"
      | "exported";
    format?: string;
    is_default?: boolean;
    nsfw?: boolean;
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
  dashboard,
  logs,
  docs,
  rp,
  easterEgg,
  content,
  errors,
} as const;
