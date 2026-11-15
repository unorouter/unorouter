"use client";

import { useFetchTokenKeyMutation } from "@/hooks/billing/token-hook";
import { copyToClipboard, copyToClipboardAsync } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

// A reveal belongs to one scope (a token, or a token per dialog opening), so a
// new scope starts hidden again.
export function useTokenKey(
  token: { id: number; key: string } | null | undefined,
  scope = "",
) {
  const t = useTranslations();
  const fetchKey = useFetchTokenKeyMutation();
  const [revealed, setRevealed] = useState<{ for: string; key: string }>();
  const owner = `${token?.id}:${scope}`;
  const revealedKey = revealed?.for === owner ? revealed.key : null;

  function toggleReveal() {
    if (!token) return;
    if (revealedKey) return setRevealed(undefined);
    fetchKey.mutate(
      { id: token.id },
      { onSuccess: (data) => setRevealed({ for: owner, key: data.key }) },
    );
  }

  function copy() {
    if (!token) return;
    const copied = () => toast.success(t("TOKEN.SUCCESS.KEY_COPIED"));
    if (revealedKey) {
      copyToClipboard(`sk-${revealedKey}`);
      return copied();
    }
    copyToClipboardAsync(() =>
      fetchKey.mutateAsync({ id: token.id }).then((data) => `sk-${data.key}`),
    )
      .then(copied)
      .catch(() => toast.error(t("TOKEN.ERROR.FETCH_KEY")));
  }

  return {
    revealedKey,
    displayKey: token ? `sk-${revealedKey ?? token.key}` : null,
    toggleReveal,
    copy,
  };
}
