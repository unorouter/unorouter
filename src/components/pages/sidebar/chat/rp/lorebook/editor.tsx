"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  useDeleteLorebookMutation,
  useLorebookQuery,
  useUpdateLorebookMutation,
} from "@/hooks/ai/rp/lorebooks";
import { analytics } from "@/lib/analytics";
import {
  lorebookFormSchema,
  type LorebookForm,
} from "@/lib/validation/rp-forms";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { formDefaults } from "@/lib/validation/helpers";
import { useTranslations } from "next-intl";
import { LorebookEntries } from "./entries";

type Props = {
  lorebookId: string;
  onDeleted: () => void;
};

export function LorebookEditor(props: Props) {
  const t = useTranslations();
  const lbQuery = useLorebookQuery(props.lorebookId);
  const updateLb = useUpdateLorebookMutation();
  const deleteLb = useDeleteLorebookMutation();

  const formValues = lbQuery.data
    ? formDefaults(lorebookFormSchema, lbQuery.data)
    : undefined;
  const form = useRpForm(lorebookFormSchema, formValues);

  const onSubmit = async (data: LorebookForm) => {
    await updateLb.mutateAsync({ id: props.lorebookId, body: data });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_LOREBOOK_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_LOREBOOK_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await deleteLb.mutateAsync(props.lorebookId);
    analytics.rp.entityAction({ entity: "lorebooks", action: "deleted" });
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
            <MyFormTextarea
              control={form.control}
              name="description"
              schema={lorebookFormSchema}
              label={t("COMMON.DESCRIPTION")}
              description={t("RP.LOREBOOK_DESCRIPTION_NOT_SENT")}
              rows={2}
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
            <MyFormTextarea
              control={form.control}
              name="greeting"
              schema={lorebookFormSchema}
              label={t("RP.LOREBOOK_GREETING")}
              description={t("RP.LOREBOOK_GREETING_HINT")}
              rows={4}
            />
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

      <LorebookEntries lorebookId={props.lorebookId} />
    </div>
  );
}
