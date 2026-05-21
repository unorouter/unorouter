"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
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
  useDeleteLorebookEntryMutation,
  useLorebookQuery,
  useUpdateLorebookEntryMutation,
} from "@/hooks/ai/rp/lorebooks";
import { analytics } from "@/lib/analytics";
import type { TranslationKey } from "@/lib/config/constants";
import {
  LOREBOOK_INJECTION_ROLES,
  LOREBOOK_POSITIONS,
  lorebookEntryFormSchema,
  type LorebookEntryForm,
  type LorebookInjectionRole,
  type LorebookPosition,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { csvToArray } from "@/lib/utils/base";
import { formDefaults } from "@/lib/validation/helpers";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
  };

export function LorebookEntries(props: { lorebookId: string }) {
  const t = useTranslations();
  const lbQuery = useLorebookQuery(props.lorebookId);
  const createMut = useCreateLorebookEntryMutation(props.lorebookId);
  const updateMut = useUpdateLorebookEntryMutation(props.lorebookId);
  const deleteMut = useDeleteLorebookEntryMutation(props.lorebookId);

  const [editingId, setEditingId] = useState<EntityEditId>(null);

  const form = useForm({
    resolver: typeboxResolver(lorebookEntryFormSchema),
    defaultValues: formDefaults(lorebookEntryFormSchema),
  });

  useEffect(() => {
    if (editingId === "new") {
      form.reset(formDefaults(lorebookEntryFormSchema));
      return;
    }
    if (!editingId) return;
    const e = lbQuery.data?.entries.find((x) => x.id === editingId);
    if (!e) return;
    // keys/secondaryKeys are string[] columns; the form edits them comma-joined.
    form.reset(
      formDefaults(lorebookEntryFormSchema, {
        ...e,
        keys: ((e.keys ?? []) as string[]).join(", "),
        secondaryKeys: ((e.secondaryKeys ?? []) as string[]).join(", "),
      }),
    );
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, lbQuery.data]);

  const onSubmit = async (data: LorebookEntryForm) => {
    const secondary = csvToArray(data.secondaryKeys);
    const body = {
      ...data,
      keys: csvToArray(data.keys),
      secondaryKeys: secondary.length > 0 ? secondary : null,
      position: data.position as LorebookPosition,
      injectionRole: data.injectionRole as LorebookInjectionRole,
      orderIndex: 0,
    };
    if (editingId === "new") {
      await createMut.mutateAsync(body);
    } else if (editingId) {
      await updateMut.mutateAsync({ entryId: editingId, body });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_LOREBOOK_ENTRY_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_LOREBOOK_ENTRY_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({
      entity: "lorebook_entries",
      action: "deleted",
    });
    if (editingId === id) setEditingId(null);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-lg font-medium">
          {t("RP.LOREBOOK_ENTRIES_TITLE")}
        </h2>
        <Button
          onClick={() => {
            analytics.rp.entityAction({
              entity: "lorebook_entries",
              action: "create_started",
            });
            setEditingId("new");
          }}
          size="sm"
        >
          <Icon name="plus" className="size-4" />
          {t("RP.LOREBOOK_ENTRY_NEW")}
        </Button>
      </div>

      {editingId && (
        <Card className="flex flex-col gap-3 p-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-3"
            >
              {/* DB column + JSON field stay named `keys` for SillyTavern/RisuAI
                  import-export compat. Only the user-facing label is "Triggers". */}
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
              <MyFormInput
                control={form.control}
                name="secondaryKeys"
                schema={lorebookEntryFormSchema}
                label={t("RP.LOREBOOK_ENTRY_SECONDARY_KEYS")}
              />
              <MyFormTextarea
                control={form.control}
                name="content"
                schema={lorebookEntryFormSchema}
                label={t("RP.LOREBOOK_ENTRY_CONTENT")}
                rows={5}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("RP.LOREBOOK_ENTRY_POSITION")}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {t(
                                POSITION_LABEL_KEY[
                                  field.value as LorebookPosition
                                ],
                              )}
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
              </div>
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
              <FormField
                control={form.control}
                name="injectionRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("RP.LOREBOOK_ENTRY_INJECTION_ROLE")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {t(
                              INJECTION_ROLE_LABEL_KEY[
                                field.value as LorebookInjectionRole
                              ],
                            )}
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
                name="constant"
                label={t("RP.LOREBOOK_ENTRY_CONSTANT")}
              />
              <MyFormSwitch
                control={form.control}
                name="selective"
                label={t("RP.LOREBOOK_ENTRY_SELECTIVE")}
              />
              <MyFormSwitch
                control={form.control}
                name="enabled"
                label={t("RP.LOREBOOK_ENTRY_ENABLED")}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  {t("COMMON.CANCEL")}
                </Button>
                <Button type="submit">{t("COMMON.SAVE")}</Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {!editingId && (
        <div className="flex flex-col gap-2">
          {lbQuery.data?.entries.map((e) => (
            <Card
              key={e.id}
              className="hover:bg-accent flex cursor-pointer flex-row items-start gap-3 p-3 transition-colors"
              onClick={() => {
                analytics.rp.entityAction({
                  entity: "lorebook_entries",
                  action: "edit_started",
                });
                setEditingId(e.id);
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">
                  {((e.keys ?? []) as string[]).join(", ") ||
                    t("RP.LOREBOOK_ENTRY_NO_KEYS")}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {e.content}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(ev) => {
                  ev.stopPropagation();
                  handleDelete(e.id);
                }}
              >
                <Icon name="trash-2" className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
