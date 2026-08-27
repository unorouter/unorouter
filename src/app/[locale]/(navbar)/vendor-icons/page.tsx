import { VendorGallery } from "@/components/pages/navbar/vendor-gallery/vendor-gallery";

// Internal design reference, kept out of robots and the sitemap via privateRoutes.
export const metadata = {
  title: "Vendor icon reference",
  robots: { index: false, follow: false },
};

export default function VendorIconsPage() {
  return <VendorGallery />;
}
