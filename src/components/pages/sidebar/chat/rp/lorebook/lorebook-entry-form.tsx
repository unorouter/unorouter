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
import { csvToArray } from "@/lib/utils/base";
import { formDefaults } from "@/lib/validation/helpers";
import {
  LOREBOOK_INJECTION_ROLES,
  LOREBOOK_POSITIONS,
  lorebookEntryFormSchema,
  type LorebookEntryForm as LorebookEntryFormValues,
  type LorebookInjectionRole,
  type LorebookPosition,
} from "@/lib/validation/rp-forms";
import type { LorebookEntryRow } from "@/lib/db/schema/rows";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

const POSITION_LABEL_KEY: Record<LorebookPosition, TranslationKey> = {
  before_char: "RP.POSITION_BEFORE_CHAR",
  after_char: "RP.POSITION_AFTER_CHAR",
  top: "RP.POSITION_TOP",
  bottom: "RP.POSITION_BOTTOM",
  at_depth: "RP.POSITION_AT_DEPTH",
};

const INJECTION_ROLE_LABEL_KEY: Record<LorebookInjectionRole, TranslationKey> =
  {
    user: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER",
    system: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM",
    assistant: "RP.LOREBOOK_ENTRY_INJECTION_ROLE_ASSISTANT",
  };

// Pull leading @@probability/@@scan_depth out of content for the form; other
// decorators stay raw-edited. scanDepth 0 = book default.
function splitDecorators(content: string): {
  content: string;
  probability: number;
  scanDepth: number;
} {
  let rest = content;
  let probability = 100;
  let scanDepth = 0;
  // Decorators may lead in either order; consume known ones until none match.
  let matched = true;
  while (matched) {
    matched = false;
    const prob = rest.match(/^@@probability[ \t]+(\d+)[ \t]*\r?\n?/i);
    if (prob) {
      probability = Math.max(0, Math.min(100, Number(prob[1])));
      rest = rest.slice(prob[0].length);
      matched = true;
    }
    const scan = rest.match(/^@@scan_depth[ \t]+(\d+)[ \t]*\r?\n?/i);
    if (scan) {
      scanDepth = Math.max(0, Math.min(100, Number(scan[1])));
      rest = rest.slice(scan[0].length);
      matched = true;
    }
  }
  return { content: rest, probability, scanDepth };
}

// Re-embed: probability only when < 100 (an actual gate), scanDepth only when > 0.
function embedDecorators(
  content: string,
  probability: number,
  scanDepth: number,
): string {
  const lines: string[] = [];
  const s = Math.max(0, Math.min(100, Math.round(scanDepth)));
  if (s > 0) lines.push(`@@scan_depth ${s}`);
  const p = Math.max(0, Math.min(100, Math.round(probability)));
  if (p < 100) lines.push(`@@probability ${p}`);
  return lines.length > 0 ? `${lines.join("\n")}\n${content}` : content;
}

export function LorebookEntryForm(props: {
  lorebookId: string;
  // "new" for a fresh entry, else the entry being edited.
  editingId: string;
  entry: LorebookEntryRow | null;
  onDone: () => void;
}) {
  const t = useTranslations();
  const createMut = useCreateLorebookEntryMutation(props.lorebookId);
  const updateMut = useUpdateLorebookEntryMutation(props.lorebookId);

  // `values` syncs the row on settle; keepDirtyValues protects in-progress typing.
  // Split decorators into form fields; keys/secondaryKeys edit comma-joined.
  const entry = props.entry;
  const split = splitDecorators(entry?.content ?? "");
  const formValues = entry
    ? formDefaults(lorebookEntryFormSchema, {
        ...entry,
        content: split.content,
        probability: split.probability,
        entryScanDepth: split.scanDepth,
        keys: (entry.keys ?? []).join(", "),
        secondaryKeys: (entry.secondaryKeys ?? []).join(", "),
      })
    : undefined;
  const form = useRpForm(lorebookEntryFormSchema, formValues);

  // Form hook outlives entry switches (no remount); explicit reset per switch,
  // keepDirtyValues only guards refetches while editing one entry.
  const reset = form.reset;
  useEffect(() => {
    reset(formValues ?? formDefaults(lorebookEntryFormSchema));
    // seed exactly once per entry switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editingId, reset]);

  const alwaysActive = form.watch("constant");
  const selective = form.watch("selective");

  const onSubmit = async (data: LorebookEntryFormValues) => {
    const secondary = csvToArray(data.secondaryKeys);
    // orderIndex owned by create/update/reorder hooks, never the form.
    const body = {
      ...data,
      content: embedDecorators(
        data.content,
        data.probability,
        data.entryScanDepth,
      ),
      keys: csvToArray(data.keys),
      secondaryKeys: secondary.length > 0 ? secondary : null,
      position: data.position,
      injectionRole: data.injectionRole,
    };
    // probability + entryScanDepth are form-only; they now live inside content.
    delete (body as { probability?: number }).probability;
    delete (body as { entryScanDepth?: number }).entryScanDepth;
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
          <MyFormTextarea
            control={form.control}
            name="content"
            schema={lorebookEntryFormSchema}
            label={t("RP.LOREBOOK_ENTRY_CONTENT")}
            rows={5}
          />

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
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("RP.LOREBOOK_ENTRY_POSITION")}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue>
                          {t(POSITION_LABEL_KEY[field.value])}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {LOREBOOK_POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {t(POSITION_LABEL_KEY[pos])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
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
