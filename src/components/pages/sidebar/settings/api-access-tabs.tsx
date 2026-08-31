"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useGenerateAccessTokenMutation } from "@/hooks/auth/settings-hook";
import { analytics } from "@/lib/analytics";
import { env } from "@/lib/config/env";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

// Stands in for the real token in the examples until one is generated, so the
// snippets read as runnable commands rather than as a template to fill in.
const TOKEN_PLACEHOLDER = "YOUR_ACCESS_TOKEN";

function CopyRow(props: { value: string; onCopy: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="bg-background flex-1 truncate rounded-md p-2 text-xs">
        {props.value}
      </code>
      <Button variant="outline" size="sm" onClick={props.onCopy}>
        <Icon name="copy" className="mr-1 h-3 w-3" />
        {props.label}
      </Button>
    </div>
  );
}

export function ApiAccessTabs() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const generateTokenMutation = useGenerateAccessTokenMutation();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const userId = authQuery.data?.id;
  const isPartner = (authQuery.data?.topup_bonus_percent ?? 0) > 0;
  const token = accessToken ?? TOKEN_PLACEHOLDER;
  const userIdValue = userId === undefined ? "YOUR_USER_ID" : String(userId);

  function handleGenerateToken() {
    generateTokenMutation.mutate(undefined, {
      onSuccess: (data) => {
        setAccessToken(data);
        analytics.settings.accessTokenGenerated();
        toast.success(t("SETTINGS.SECURITY.TOKEN_GENERATED"));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  function copy(value: string, message: string) {
    copyToClipboard(value);
    toast.success(message);
  }

  // Every dashboard route takes the same two headers, so the snippets share
  // them. Creating a key does not return the key: the response is a bare
  // success, and the secret is revealed by a separate call against its id.
  const auth = `-H "Authorization: Bearer ${token}" \\
  -H "New-Api-User: ${userIdValue}"`;

  const curlExamples = [
    {
      key: "create-token",
      title: t("SETTINGS.SECURITY.EXAMPLE_CREATE_TOKEN"),
      command: `curl -X POST "${env.apiUrl}/api/token/" \\
  ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-api-key",
    "expired_time": -1,
    "unlimited_quota": true,
    "group": "default"
  }'`,
    },
    {
      key: "list-tokens",
      title: t("SETTINGS.SECURITY.EXAMPLE_LIST_TOKENS"),
      command: `curl "${env.apiUrl}/api/token/?p=1&page_size=10" \\
  ${auth}`,
    },
    {
      key: "reveal-token",
      title: t("SETTINGS.SECURITY.EXAMPLE_REVEAL_TOKEN"),
      command: `curl -X POST "${env.apiUrl}/api/token/123/key" \\
  ${auth}`,
    },
    {
      key: "chat",
      title: t("SETTINGS.SECURITY.EXAMPLE_CHAT"),
      command: `curl "${env.apiUrl}/v1/chat/completions" \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-5-thinking",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
    },
    // The partner routes identify the caller by token; the user_id in a grant is
    // the RECIPIENT, which is why an account needs to be able to read its own.
    ...(isPartner
      ? [
          {
            key: "gift-card",
            title: t("SETTINGS.SECURITY.EXAMPLE_GIFT_CARD"),
            command: `curl -X POST "${env.apiUrl}/api/user/partner/redemption" \\
  ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"name": "order-1042", "quota": 5000000, "expired_time": 0}'`,
          },
          {
            key: "grant",
            title: t("SETTINGS.SECURITY.EXAMPLE_GRANT"),
            command: `curl -X POST "${env.apiUrl}/api/user/partner/grant" \\
  ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": 12345, "quota": 5000000}'`,
          },
        ]
      : []),
  ];

  return (
    <Tabs defaultValue="credentials">
      <TabsList variant="line">
        <TabsTrigger value="credentials">
          <Icon name="key" className="h-3.5 w-3.5" />
          {t("SETTINGS.SECURITY.TAB_CREDENTIALS")}
        </TabsTrigger>
        <TabsTrigger value="examples">
          <Icon name="terminal" className="h-3.5 w-3.5" />
          {t("SETTINGS.SECURITY.TAB_EXAMPLES")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="credentials" className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="key" className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">
              {t("SETTINGS.SECURITY.ACCESS_TOKEN")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("SETTINGS.SECURITY.ACCESS_TOKEN_DESC")}
          </p>
          {accessToken ? (
            <CopyRow
              value={accessToken}
              label={t("SETTINGS.SECURITY.COPY_TOKEN")}
              onCopy={() => copy(accessToken, t("COMMON.COPIED_CLIPBOARD"))}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={generateTokenMutation.isPending}
              onClick={handleGenerateToken}
            >
              <Icon name="key" className="mr-1 h-3 w-3" />
              {t("SETTINGS.SECURITY.GENERATE_TOKEN")}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="globe" className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">
              {t("SETTINGS.SECURITY.API_BASE_URL")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("SETTINGS.SECURITY.API_BASE_URL_DESC")}
          </p>
          <CopyRow
            value={env.apiUrl}
            label={t("SETTINGS.SECURITY.COPY_TOKEN")}
            onCopy={() =>
              copy(env.apiUrl, t("SETTINGS.SECURITY.API_URL_COPIED"))
            }
          />
        </div>

        {userId !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon name="user" className="text-muted-foreground h-4 w-4" />
              <span className="font-medium">
                {t("SETTINGS.SECURITY.USER_ID")}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("SETTINGS.SECURITY.USER_ID_DESC")}
            </p>
            <CopyRow
              value={String(userId)}
              label={t("SETTINGS.SECURITY.COPY_TOKEN")}
              onCopy={() => copy(String(userId), t("COMMON.COPIED_CLIPBOARD"))}
            />
          </div>
        )}

        <a
          href={`${env.apiUrl}/swagger`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
          onClick={() => analytics.settings.apiReferenceOpened()}
        >
          <Icon name="book-open" className="h-3 w-3" />
          {t("SETTINGS.SECURITY.API_REFERENCE")}
          <Icon name="external-link" className="h-3 w-3" />
        </a>
      </TabsContent>

      <TabsContent value="examples" className="space-y-4 pt-4">
        {!accessToken && (
          <p className="text-muted-foreground text-xs">
            {t("SETTINGS.SECURITY.EXAMPLES_HINT")}
          </p>
        )}
        {curlExamples.map((example) => (
          <div key={example.key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{example.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copy(example.command, t("COMMON.COPIED_CLIPBOARD"))
                }
              >
                <Icon name="copy" className="mr-1 h-3 w-3" />
                {t("SETTINGS.SECURITY.COPY_TOKEN")}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
              <code>{example.command}</code>
            </pre>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
