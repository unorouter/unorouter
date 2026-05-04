"use client";
/* eslint-disable react-hooks/set-state-in-effect -- form initialized when entry clicked */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateLorebookEntryMutation,
  useCreateLorebookMutation,
  useDeleteLorebookEntryMutation,
  useDeleteLorebookMutation,
  useLorebookQuery,
  useLorebooksQuery,
  useUpdateLorebookEntryMutation,
  useUpdateLorebookMutation,
} from "@/hooks/rp-hook";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPlus, LuTrash2 } from "react-icons/lu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LorebookList(props: Props) {
  const t = useTranslations();
  const lorebooksQuery = useLorebooksQuery();
  const createMut = useCreateLorebookMutation();
  const deleteMut = useDeleteLorebookMutation();

  const [openLbId, setOpenLbId] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) setOpenLbId(null);
  }, [props.open]);

  const handleCreate = async () => {
    await createMut.mutateAsync({ body: { name: "Untitled lorebook" } });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={createMut.isPending}>
                <LuPlus className="size-4" />
                {t("RP.LOREBOOKS_NEW")}
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
                  className="hover:bg-accent flex cursor-pointer items-center gap-3 p-3 transition-colors"
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scanDepth, setScanDepth] = useState(4);
  const [tokenBudget, setTokenBudget] = useState(1500);

  useEffect(() => {
    const l = lbQuery.data;
    if (!l) return;
    setName(l.name);
    setDescription(l.description ?? "");
    setScanDepth(l.scanDepth ?? 4);
    setTokenBudget(l.tokenBudget ?? 1500);
  }, [lbQuery.data]);

  const saveHeader = async () => {
    await updateLb.mutateAsync({
      id: props.lorebookId,
      body: { name, description, scanDepth, tokenBudget },
    });
  };

  const handleDelete = async () => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteLb.mutateAsync(props.lorebookId);
    props.onDeleted();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <Label>{t("COMMON.NAME")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("COMMON.DESCRIPTION")}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>{t("RP.LOREBOOK_SCAN_DEPTH")}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={scanDepth}
              onChange={(e) => setScanDepth(Number(e.target.value) || 0)}
            />
            <span className="text-muted-foreground text-xs">
              {t("RP.LOREBOOK_SCAN_DEPTH_HINT")}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("RP.LOREBOOK_TOKEN_BUDGET")}</Label>
            <Input
              type="number"
              min={100}
              max={32000}
              step={100}
              value={tokenBudget}
              onChange={(e) => setTokenBudget(Number(e.target.value) || 0)}
            />
            <span className="text-muted-foreground text-xs">
              {t("RP.LOREBOOK_TOKEN_BUDGET_HINT")}
            </span>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleDelete}>
            <LuTrash2 className="size-4" />
            {t("COMMON.DELETE")}
          </Button>
          <Button onClick={saveHeader}>{t("COMMON.SAVE")}</Button>
        </div>
      </Card>

      <Entries lorebookId={props.lorebookId} />
    </div>
  );
}

type EntryForm = {
  keys: string;
  secondaryKeys: string;
  content: string;
  position: "before_char" | "after_char" | "top" | "bottom" | "at_depth";
  priority: number;
  depth: number;
  constant: boolean;
  selective: boolean;
  enabled: boolean;
};

const emptyEntry: EntryForm = {
  keys: "",
  secondaryKeys: "",
  content: "",
  position: "before_char",
  priority: 100,
  depth: 4,
  constant: false,
  selective: false,
  enabled: true,
};

function Entries(props: { lorebookId: string }) {
  const t = useTranslations();
  const lbQuery = useLorebookQuery(props.lorebookId);
  const createMut = useCreateLorebookEntryMutation(props.lorebookId);
  const updateMut = useUpdateLorebookEntryMutation(props.lorebookId);
  const deleteMut = useDeleteLorebookEntryMutation(props.lorebookId);

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyEntry);

  useEffect(() => {
    if (editingId === "new") {
      setForm(emptyEntry);
    } else if (editingId) {
      const e = lbQuery.data?.entries.find((x) => x.id === editingId);
      if (e) {
        setForm({
          keys: ((e.keys ?? []) as string[]).join(", "),
          secondaryKeys: ((e.secondaryKeys ?? []) as string[]).join(", "),
          content: e.content ?? "",
          position: (e.position ?? "before_char") as EntryForm["position"],
          priority: e.priority ?? 100,
          depth: e.depth ?? 4,
          constant: e.constant ?? false,
          selective: e.selective ?? false,
          enabled: e.enabled ?? true,
        });
      }
    }
  }, [editingId, lbQuery.data]);

  const handleSave = async () => {
    const body = {
      keys: form.keys
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      secondaryKeys: form.secondaryKeys
        ? form.secondaryKeys.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      content: form.content,
      position: form.position,
      priority: form.priority,
      depth: form.depth,
      constant: form.constant,
      selective: form.selective,
      enabled: form.enabled,
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
          <div className="flex flex-col gap-2">
            <Label>{t("RP.LOREBOOK_ENTRY_KEYS")}</Label>
            <Input
              value={form.keys}
              onChange={(e) => setForm({ ...form, keys: e.target.value })}
              placeholder="dragon, wyrm, drake"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("RP.LOREBOOK_ENTRY_SECONDARY_KEYS")}</Label>
            <Input
              value={form.secondaryKeys}
              onChange={(e) =>
                setForm({ ...form, secondaryKeys: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("RP.LOREBOOK_ENTRY_CONTENT")}</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("RP.LOREBOOK_ENTRY_POSITION")}</Label>
              <Select
                value={form.position}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    position: (v ?? "before_char") as EntryForm["position"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_char">
                    {t("RP.POSITION_BEFORE_CHAR")}
                  </SelectItem>
                  <SelectItem value="after_char">
                    {t("RP.POSITION_AFTER_CHAR")}
                  </SelectItem>
                  <SelectItem value="top">{t("RP.POSITION_TOP")}</SelectItem>
                  <SelectItem value="bottom">
                    {t("RP.POSITION_BOTTOM")}
                  </SelectItem>
                  <SelectItem value="at_depth">
                    {t("RP.POSITION_AT_DEPTH")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("RP.LOREBOOK_ENTRY_PRIORITY")}</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <Label>{t("RP.LOREBOOK_ENTRY_CONSTANT")}</Label>
            <Switch
              checked={form.constant}
              onCheckedChange={(v) => setForm({ ...form, constant: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <Label>{t("RP.LOREBOOK_ENTRY_SELECTIVE")}</Label>
            <Switch
              checked={form.selective}
              onCheckedChange={(v) => setForm({ ...form, selective: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <Label>{t("RP.LOREBOOK_ENTRY_ENABLED")}</Label>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              {t("COMMON.CANCEL")}
            </Button>
            <Button onClick={handleSave}>{t("COMMON.SAVE")}</Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {lbQuery.data?.entries.map((e) => (
          <Card
            key={e.id}
            className="hover:bg-accent flex cursor-pointer items-start gap-3 p-3 transition-colors"
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
    </Card>
  );
}
