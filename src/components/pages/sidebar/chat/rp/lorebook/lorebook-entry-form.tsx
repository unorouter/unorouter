"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateLorebookEntryMutation,
  useUpdateLorebookEntryMutation,
} from "@/hooks/ai/rp/lorebooks";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import type { TranslationKey } from "@/lib/config/constants";
import { clamp, csvToArray } from "@/lib/utils/base";
import { formDefaults } from "@/lib/validation/helpers";
import {
  LOREBOOK_INJECTION_ROLES,
  lorebookEntryFormSchema,
  type LorebookEntryForm as LorebookEntryFormValues,
  type LorebookInjectionRole,
} from "@/lib/validation/rp-forms";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import type { LorebookEntryRow } from "@/lib/db/schema/rows";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useWatch, type Control } from "react-hook-form";

const INJECTION_ROLE_LABEL_KEY: Record<LorebookInjectionRole, TranslationKey> =
  {
    user: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER",
    system: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM",
    assistant: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_ASSISTANT",
  };

// Same counter the lorebook budget uses at assembly, so the number is comparable
// to the tokenBudget setting. Subscribes to its own field: the whole form must not
// re-render per keystroke in the content box.
function EntryTokenEstimate(props: {
  control: Control<LorebookEntryFormValues>;
}) {
  const t = useTranslations();
  const content = useWatch({ control: props.control, name: "content" });
  const count = countTokens(content);
  if (!content?.trim() || count === 0) return null;
  return (
    <p className="text-muted-foreground text-xs">
      {t("RP.LOREBOOK_ENTRY_TOKENS", { count })}
    </p>
  );
}

function splitDecorators(content: string): {
  content: string;
  probability: number;
  scanDepth: number;
} {
  let rest = content;
  let probability = 100;
  let scanDepth = 0;
  let matched = true;
  while (matched) {
    matched = false;
    const prob = rest.match(/^@@probability[ \t]+(\d+)[ \t]*\r?\n?/i);
    if (prob) {
      probability = clamp(Number(prob[1]), 0, 100);
      rest = rest.slice(prob[0].length);
      matched = true;
    }
    const scan = rest.match(/^@@scan_depth[ \t]+(\d+)[ \t]*\r?\n?/i);
    if (scan) {
      scanDepth = clamp(Number(scan[1]), 0, 100);
      rest = rest.slice(scan[0].length);
      matched = true;
    }
  }
  return { content: rest, probability, scanDepth };
}

function embedDecorators(
  content: string,
  probability: number,
  scanDepth: number,
): string {
  const lines: string[] = [];
  const s = clamp(Math.round(scanDepth), 0, 100);
  if (s > 0) lines.push(`@@scan_depth ${s}`);
  const p = clamp(Math.round(probability), 0, 100);
  if (p < 100) lines.push(`@@probability ${p}`);
  return lines.length > 0 ? `${lines.join("\n")}\n${content}` : content;
}

export function LorebookEntryForm(props: {
  lorebookId: string;
  editingId: string;
  entry: LorebookEntryRow | null;
  onDone: () => void;
}) {
  const t = useTranslations();
  const createMut = useCreateLorebookEntryMutation(props.lorebookId);
  const updateMut = useUpdateLorebookEntryMutation(props.lorebookId);

  const entry = props.entry;
  const split = splitDecorators(entry?.content ?? "");
  const formValues = entry
    ? formDefaults(lorebookEntryFormSchema, {
        ...entry,
        comment: entry.comment ?? "",
        content: split.content,
        probability: split.probability,
        entryScanDepth: split.scanDepth,
        keys: (entry.keys ?? []).join(", "),
        secondaryKeys: (entry.secondaryKeys ?? []).join(", "),
      })
    : undefined;
  const form = useRpForm(lorebookEntryFormSchema, formValues);

  const reset = form.reset;
  useEffect(() => {
    reset(formValues ?? formDefaults(lorebookEntryFormSchema));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editingId, reset]);

  const alwaysActive = form.watch("constant");
  const selective = form.watch("selective");

  const onSubmit = async (data: LorebookEntryFormValues) => {
    const secondary = csvToArray(data.secondaryKeys);
    const { probability, entryScanDepth, ...rest } = data;
    const body = {
      ...rest,
      comment: data.comment.trim() || null,
      content: embedDecorators(data.content, probability, entryScanDepth),
      keys: csvToArray(data.keys),
      secondaryKeys: secondary.length > 0 ? secondary : null,
      injectionRole: data.injectionRole,
    };
    if (props.editingId === "new") {
      await createMut.mutateAsync(body);
    } else {
      await updateMut.mutateAsync({ entryId: props.editingId, body });
    }
    props.onDone();
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <MyFormInput
              control={form.control}
              name="comment"
              schema={lorebookEntryFormSchema}
              label={t("RP.LOREBOOK_ENTRY_COMMENT")}
              placeholder={t("RP.LOREBOOK_ENTRY_COMMENT_PLACEHOLDER")}
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.LOREBOOK_ENTRY_COMMENT_HINT")}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <MyFormTextarea
              control={form.control}
              name="content"
              schema={lorebookEntryFormSchema}
              label={t("RP.LOREBOOK_ENTRY_CONTENT")}
              rows={5}
            />
            <EntryTokenEstimate control={form.control} />
          </div>

          {/* Headline toggle (RisuAI mental model): an entry is either
              always-active or key-triggered. When always-active, the
              trigger fields are hidden because they never apply. */}
          <div className="flex flex-col gap-1">
            <MyFormSwitch
              control={form.control}
              name="constant"
              label={t("RP.LOREBOOK_ENTRY_CONSTANT")}
            />
            <p className="text-muted-foreground text-xs">
              {t("RP.LOREBOOK_ENTRY_CONSTANT_HINT")}
            </p>
          </div>

          {!alwaysActive && (
            <>
              {/* DB column + JSON field stay named `keys` for SillyTavern/
                  RisuAI import-export compat. Label is "Activation keys". */}
              <div className="flex flex-col gap-1">
                <MyFormInput
                  control={form.control}
                  name="keys"
                  schema={lorebookEntryFormSchema}
                  label={t("RP.LOREBOOK_ENTRY_KEYS")}
                  placeholder="dragon, wyrm, drake"
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.LOREBOOK_ENTRY_KEYS_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="selective"
                  label={t("RP.LOREBOOK_ENTRY_SELECTIVE")}
                />
              </div>
              {selective && (
                <MyFormInput
                  control={form.control}
                  name="secondaryKeys"
                  schema={lorebookEntryFormSchema}
                  label={t("RP.LOREBOOK_ENTRY_SECONDARY_KEYS")}
                />
              )}
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="matchWholeWords"
                  label={t("RP.LOREBOOK_ENTRY_MATCH_WHOLE_WORDS")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.LOREBOOK_ENTRY_MATCH_WHOLE_WORDS_HINT")}
                </p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <MyFormInput
                control={form.control}
                name="orderIndex"
                schema={lorebookEntryFormSchema}
                label={t("RP.LOREBOOK_ENTRY_ORDER")}
                type="number"
              />
              <p className="text-muted-foreground text-xs">
                {t("RP.LOREBOOK_ENTRY_ORDER_HINT")}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <MyFormInput
                control={form.control}
                name="priority"
                schema={lorebookEntryFormSchema}
                label={t("RP.LOREBOOK_ENTRY_PRIORITY")}
                type="number"
              />
              <p className="text-muted-foreground text-xs">
                {t("RP.LOREBOOK_ENTRY_PRIORITY_HINT")}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <MyFormInput
                control={form.control}
                name="probability"
                schema={lorebookEntryFormSchema}
                label={t("RP.LOREBOOK_ENTRY_PROBABILITY")}
                type="number"
              />
              <p className="text-muted-foreground text-xs">
                {t("RP.LOREBOOK_ENTRY_PROBABILITY_HINT")}
              </p>
            </div>
            {!alwaysActive && (
              <div className="flex flex-col gap-1">
                <MyFormInput
                  control={form.control}
                  name="entryScanDepth"
                  schema={lorebookEntryFormSchema}
                  label={t("RP.LOREBOOK_ENTRY_SCAN_DEPTH")}
                  type="number"
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.LOREBOOK_ENTRY_SCAN_DEPTH_HINT")}
                </p>
              </div>
            )}
          </div>
          <FormField
            control={form.control}
            name="injectionRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("RP.LOREBOOK_ENTRY_INJECTION_ROLE")}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue>
                        {t(INJECTION_ROLE_LABEL_KEY[field.value])}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LOREBOOK_INJECTION_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(INJECTION_ROLE_LABEL_KEY[role])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  {t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_HINT")}
                </p>
              </FormItem>
            )}
          />
          <MyFormSwitch
            control={form.control}
            name="enabled"
            label={t("RP.LOREBOOK_ENTRY_ENABLED")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={props.onDone}>
              {t("COMMON.CANCEL")}
            </Button>
            <Button type="submit">{t("COMMON.SAVE")}</Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
