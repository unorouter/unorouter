"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Icon } from "@/components/ui/icon";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useCreateLorebookEntryMutation,
  useCreateLorebookMutation,
  useDeleteLorebookEntryMutation,
  useDeleteLorebookMutation,
  useImportLorebookMutation,
  useLorebookQuery,
  useLorebooksQuery,
  useUpdateLorebookEntryMutation,
  useUpdateLorebookMutation,
} from "@/hooks/rp/lorebooks";
import { RpLoginGate } from "./rp-login-gate";
import { analytics } from "@/lib/analytics";
import { rpc } from "@/lib/rpc";
import { downloadBlob } from "@/lib/utils/client";
import {
  lorebookEntryFormSchema,
  lorebookFormSchema,
  type LorebookEntryForm,
  type LorebookForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LorebookList(props: Props) {
  const t = useTranslations();
  const isLoggedIn = !!useAuthQuery().data;
  const lorebooksQuery = useLorebooksQuery();
  const createMut = useCreateLorebookMutation();
  const deleteMut = useDeleteLorebookMutation();
  const importMut = useImportLorebookMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openLbId, setOpenLbId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection when dialog closes
    if (!props.open) setOpenLbId(null);
  }, [props.open]);

  const handleCreate = async () => {
    analytics.rp.entityAction({
      entity: "lorebook",
      action: "create_started",
    });
    await createMut.mutateAsync({ body: { name: "Untitled lorebook" } });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "lorebook", action: "deleted" });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      await importMut.mutateAsync(file);
      analytics.rp.entityAction({ entity: "lorebook", action: "imported" });
    } catch {
      analytics.rp.entityAction({
        entity: "lorebook",
        action: "import_failed",
      });
    }
  };

  const handleExport = async (
    id: string,
    format: "sillytavern" | "agnai" | "risu" | "ccv3",
  ) => {
    const { response, error } = await rpc.api.ai.rp
      .lorebooks({ id })
      .export.get({ query: { format } });
    if (error || !response.ok) return;
    const blob = await response.blob();
    const fname =
      response.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `lorebook-${id}.${format}.json`;
    downloadBlob(blob, fname);
    analytics.rp.entityAction({
      entity: "lorebook",
      action: "exported",
      format,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {openLbId && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpenLbId(null)}
              >
                <Icon name="arrow-left" className="size-4" />
              </Button>
            )}
            {openLbId
              ? (lorebooksQuery.data?.find((l) => l.id === openLbId)?.name ??
                t("RP.LOREBOOKS_TITLE"))
              : t("RP.LOREBOOKS_TITLE")}
          </DialogTitle>
        </DialogHeader>

        {!isLoggedIn ? (
          <RpLoginGate />
        ) : openLbId ? (
          <LorebookEditorInline
            lorebookId={openLbId}
            onDeleted={() => setOpenLbId(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "lorebook",
                    action: "import_picker_opened",
                  });
                  fileInputRef.current?.click();
                }}
                disabled={importMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="upload" className="size-4" />
                <span className="truncate">{t("RP.LOREBOOKS_IMPORT")}</span>
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="plus" className="size-4" />
                <span className="truncate">{t("RP.LOREBOOKS_NEW")}</span>
              </Button>
            </div>

            {lorebooksQuery.data?.length === 0 && (
              <Card className="text-muted-foreground py-10 text-center text-sm">
                {t("RP.LOREBOOKS_EMPTY")}
              </Card>
            )}

            <div className="flex flex-col gap-2">
              {lorebooksQuery.data?.map((l) => (
                <Card
                  key={l.id}
                  className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
                  onClick={() => {
                    analytics.rp.entityAction({
                      entity: "lorebook",
                      action: "edit_started",
                    });
                    setOpenLbId(l.id);
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{l.name}</span>
                    {l.description && (
                      <span className="text-muted-foreground truncate text-xs">
                        {l.description}
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SyncBadge kind="lorebooks" id={l.id} payload={l} compact />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("RP.LOREBOOKS_EXPORT")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <Icon name="download" className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "sillytavern")}
                      >
                        {t("RP.EXPORT_SILLYTAVERN")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "agnai")}
                      >
                        {t("RP.EXPORT_AGNAI")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "risu")}
                      >
                        {t("RP.EXPORT_RISU")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "ccv3")}
                      >
                        {t("RP.EXPORT_CCV3")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(l.id);
                    }}
                  >
                    <Icon name="trash-2" className="size-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LorebookEditorInline(props: {
  lorebookId: string;
  onDeleted: () => void;
}) {
  const t = useTranslations();
  const lbQuery = useLorebookQuery(props.lorebookId);
  const updateLb = useUpdateLorebookMutation();
  const deleteLb = useDeleteLorebookMutation();

  const form = useForm({
    resolver: typeboxResolver(lorebookFormSchema),
    defaultValues: Value.Default(lorebookFormSchema, {}) as LorebookForm,
  });

  useEffect(() => {
    const l = lbQuery.data;
    if (!l) return;
    form.reset({
      name: l.name,
      description: l.description ?? "",
      scanDepth: l.scanDepth ?? 4,
      tokenBudget: l.tokenBudget ?? 1500,
    });
    // form.reset is stable; we want to re-seed when the lorebook changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbQuery.data, props.lorebookId]);

  const onSubmit = async (data: LorebookForm) => {
    await updateLb.mutateAsync({ id: props.lorebookId, body: data });
  };

  const handleDelete = async () => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteLb.mutateAsync(props.lorebookId);
    analytics.rp.entityAction({ entity: "lorebook", action: "deleted" });
    props.onDeleted();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            <MyFormInput
              control={form.control}
              name="name"
              schema={lorebookFormSchema}
              label={t("COMMON.NAME")}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("COMMON.DESCRIPTION")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <MyFormInput
                  control={form.control}
                  name="scanDepth"
                  schema={lorebookFormSchema}
                  label={t("RP.LOREBOOK_SCAN_DEPTH")}
                  type="number"
                />
                <span className="text-muted-foreground text-xs">
                  {t("RP.LOREBOOK_SCAN_DEPTH_HINT")}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <MyFormInput
                  control={form.control}
                  name="tokenBudget"
                  schema={lorebookFormSchema}
                  label={t("RP.LOREBOOK_TOKEN_BUDGET")}
                  type="number"
                  step={100}
                />
                <span className="text-muted-foreground text-xs">
                  {t("RP.LOREBOOK_TOKEN_BUDGET_HINT")}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={handleDelete}>
                <Icon name="trash-2" className="size-4" />
                {t("COMMON.DELETE")}
              </Button>
              <Button type="submit">{t("COMMON.SAVE")}</Button>
            </div>
          </form>
        </Form>
      </Card>

      <Entries lorebookId={props.lorebookId} />
    </div>
  );
}

function Entries(props: { lorebookId: string }) {
  const t = useTranslations();
  const lbQuery = useLorebookQuery(props.lorebookId);
  const createMut = useCreateLorebookEntryMutation(props.lorebookId);
  const updateMut = useUpdateLorebookEntryMutation(props.lorebookId);
  const deleteMut = useDeleteLorebookEntryMutation(props.lorebookId);

  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const form = useForm({
    resolver: typeboxResolver(lorebookEntryFormSchema),
    defaultValues: Value.Default(
      lorebookEntryFormSchema,
      {},
    ) as LorebookEntryForm,
  });

  useEffect(() => {
    if (editingId === "new") {
      form.reset(
        Value.Default(lorebookEntryFormSchema, {}) as LorebookEntryForm,
      );
      return;
    }
    if (!editingId) return;
    const e = lbQuery.data?.entries.find((x) => x.id === editingId);
    if (!e) return;
    form.reset({
      keys: ((e.keys ?? []) as string[]).join(", "),
      secondaryKeys: ((e.secondaryKeys ?? []) as string[]).join(", "),
      content: e.content ?? "",
      position: (e.position ?? "before_char") as LorebookEntryForm["position"],
      priority: e.priority ?? 100,
      depth: e.depth ?? 4,
      constant: e.constant ?? false,
      selective: e.selective ?? false,
      enabled: e.enabled ?? true,
      matchWholeWords: e.matchWholeWords ?? false,
      injectionRole: (e.injectionRole ??
        "user") as LorebookEntryForm["injectionRole"],
    });
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, lbQuery.data]);

  const onSubmit = async (data: LorebookEntryForm) => {
    const body = {
      keys: data.keys
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      secondaryKeys: data.secondaryKeys
        ? data.secondaryKeys
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      content: data.content,
      position: data.position as
        | "before_char"
        | "after_char"
        | "top"
        | "bottom"
        | "at_depth",
      priority: data.priority,
      depth: data.depth,
      constant: data.constant,
      selective: data.selective,
      enabled: data.enabled,
      matchWholeWords: data.matchWholeWords,
      injectionRole: data.injectionRole as "system" | "user",
    };
    if (editingId === "new") {
      await createMut.mutateAsync(body);
    } else if (editingId) {
      await updateMut.mutateAsync({ entryId: editingId, body });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({
      entity: "lorebook_entry",
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
              entity: "lorebook_entry",
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
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("RP.LOREBOOK_ENTRY_CONTENT")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} />
                    </FormControl>
                  </FormItem>
                )}
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
                          onValueChange={(v) =>
                            field.onChange(v ?? "before_char")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {field.value === "before_char"
                                ? t("RP.POSITION_BEFORE_CHAR")
                                : field.value === "after_char"
                                  ? t("RP.POSITION_AFTER_CHAR")
                                  : field.value === "top"
                                    ? t("RP.POSITION_TOP")
                                    : field.value === "bottom"
                                      ? t("RP.POSITION_BOTTOM")
                                      : t("RP.POSITION_AT_DEPTH")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before_char">
                              {t("RP.POSITION_BEFORE_CHAR")}
                            </SelectItem>
                            <SelectItem value="after_char">
                              {t("RP.POSITION_AFTER_CHAR")}
                            </SelectItem>
                            <SelectItem value="top">
                              {t("RP.POSITION_TOP")}
                            </SelectItem>
                            <SelectItem value="bottom">
                              {t("RP.POSITION_BOTTOM")}
                            </SelectItem>
                            <SelectItem value="at_depth">
                              {t("RP.POSITION_AT_DEPTH")}
                            </SelectItem>
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
                        onValueChange={(v) => field.onChange(v ?? "user")}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {field.value === "system"
                              ? t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM")
                              : t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            {t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER")}
                          </SelectItem>
                          <SelectItem value="system">
                            {t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM")}
                          </SelectItem>
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
                  entity: "lorebook_entry",
                  action: "edit_started",
                });
                setEditingId(e.id);
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">
                  {((e.keys ?? []) as string[]).join(", ") || "(no keys)"}
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
