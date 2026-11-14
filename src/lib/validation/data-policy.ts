import type {
  PricingCatalogDetail,
  PricingModelGroupsData,
  UserGroupInfo,
} from "@/openapi";

export type TransferBasis = "adequacy" | "dpf" | "scc" | "none" | "unknown";

// Most conservative profile across the channels behind a group. Loose on
// purpose: the generated gateway types carry prompts and transfer as strings.
export type GroupDataPolicy = {
  seat_country?: string;
  prompts?: string;
  transfer?: string;
  unsafe_third_country?: boolean;
};

// A group without any recorded policy is absent from the map.
export type GroupProviders = Record<string, GroupDataPolicy>;

export type ModelDetailData = PricingCatalogDetail;

export type ModelGroupsData = PricingModelGroupsData;

export type UserGroup = UserGroupInfo;
