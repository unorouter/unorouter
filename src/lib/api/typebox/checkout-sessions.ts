import { t } from "elysia";

const acpAddress = t.Object({
  name: t.String(),
  line_one: t.String(),
  line_two: t.Optional(t.String()),
  city: t.String(),
  state: t.String(),
  country: t.String(),
  postal_code: t.String(),
});

const acpBuyer = t.Object({
  first_name: t.Optional(t.String()),
  last_name: t.Optional(t.String()),
  email: t.Optional(t.String()),
  phone_number: t.Optional(t.String()),
});

const acpFulfillmentDetails = t.Object({
  name: t.Optional(t.String()),
  phone_number: t.Optional(t.String()),
  email: t.Optional(t.String()),
  address: t.Optional(acpAddress),
});

const acpItem = t.Object({
  id: t.String(),
  quantity: t.Integer({ minimum: 1 }),
});

const acpSelectedFulfillmentOption = t.Object({
  type: t.Optional(t.String()),
  option_id: t.String(),
  item_ids: t.Optional(t.Array(t.String())),
});

export const createSessionBody = t.Object({
  items: t.Array(acpItem, { minItems: 1 }),
  buyer: t.Optional(acpBuyer),
  fulfillment_details: t.Optional(acpFulfillmentDetails),
});

export const updateSessionBody = t.Object({
  items: t.Optional(t.Array(acpItem, { minItems: 1 })),
  buyer: t.Optional(acpBuyer),
  fulfillment_details: t.Optional(acpFulfillmentDetails),
  selected_fulfillment_options: t.Optional(
    t.Array(acpSelectedFulfillmentOption),
  ),
});

export const completeSessionBody = t.Object({
  buyer: t.Optional(acpBuyer),
  payment_data: t.Optional(t.Unknown()),
  authentication_result: t.Optional(t.Unknown()),
});

export const cancelSessionBody = t.Optional(t.Unknown());
