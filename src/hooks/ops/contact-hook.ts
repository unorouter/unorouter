"use client";

import { useApiMutation } from "@/lib/react-query/hooks";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";

export function useSendContactMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.ops.contact, "post">) =>
      handleElysia(await rpc.api.ops.contact.post(args.body)),
  });
}
