import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Link } from "@/i18n/navigation";
import { getTrendingModels } from "@/lib/api/page-data";
import { modelHref } from "@/lib/utils/base";
import { getTranslations } from "next-intl/server";

// Posts otherwise link only the /models index, so model pages got no links
// from the blog at all.
export async function TrendingModels() {
  const models = await getTrendingModels(6);
  if (models.length === 0) return null;
  const t = await getTranslations();

  return (
    <section className="mt-16">
      <h2 className="text-muted-foreground mb-4 font-mono text-[10px] tracking-widest uppercase">
        {t("BLOG.TRENDING_MODELS")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {models.map((m) => (
          <Link
            key={m.model_name}
            href={modelHref(m.model_name, m.vendor)}
            prefetch={false}
            className="hover:bg-muted/50 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors"
          >
            <VendorIcon vendor={m.vendor_icon || m.vendor} size={16} />
            {m.model_name}
          </Link>
        ))}
      </div>
    </section>
  );
}
