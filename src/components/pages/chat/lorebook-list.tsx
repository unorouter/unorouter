"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/hooks/rp-hook";
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
import { LuArrowLeft, LuPlus, LuTrash2, LuUpload } from "react-icons/lu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LorebookList(props: Props) {
  const t = useTranslations();
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
    await createMut.mutateAsync({ body: { name: "Untitled lorebook" } });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await importMut.mutateAsync(file);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {openLbId && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpenLbId(null)}
              >
                <LuArrowLeft className="size-4" />
              </Button>
            )}
            {openLbId
              ? lorebooksQuery.data?.find((l) => l.id === openLbId)?.name ??
                t("RP.LOREBOOKS_TITLE")
              : t("RP.LOREBOOKS_TITLE")}
          </DialogTitle>
        </DialogHeader>

        {openLbId ? (
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
                onClick={() => fileInputRef.current?.click()}
                disabled={importMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <LuUpload className="size-4" />
                <span className="truncate">{t("RP.LOREBOOKS_IMPORT")}</span>
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <LuPlus className="size-4" />
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
                  className="hover:bg-accent flex flex-row cursor-pointer items-center gap-3 p-3 transition-colors"
                  onClick={() => setOpenLbId(l.id)}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{l.name}</span>
                    {l.description && (
                      <span className="text-muted-foreground truncate text-xs">
                        {l.description}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(l.id);
                    }}
                  >
                    <LuTrash2 className="size-4" />
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
                <LuTrash2 className="size-4" />
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
    if (editingId === id) setEditingId(null);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-lg font-medium">
          {t("RP.LOREBOOK_ENTRIES_TITLE")}
        </h2>
        <Button onClick={() => setEditingId("new")} size="sm">
          <LuPlus className="size-4" />
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
              <MyFormInput
                control={form.control}
                name="keys"
                schema={lorebookEntryFormSchema}
                label={t("RP.LOREBOOK_ENTRY_KEYS")}
                placeholder="dragon, wyrm, drake"
              />
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
                <MyFormInput
                  control={form.control}
                  name="priority"
                  schema={lorebookEntryFormSchema}
                  label={t("RP.LOREBOOK_ENTRY_PRIORITY")}
                  type="number"
                />
              </div>
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
              className="hover:bg-accent flex flex-row cursor-pointer items-start gap-3 p-3 transition-colors"
              onClick={() => setEditingId(e.id)}
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
                <LuTrash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
