export async function getRpc() {
  const [{ rpc }, { handleElysia }] = await Promise.all([
    import("@/lib/rpc"),
    import("@/lib/utils/base"),
  ]);
  return { rpc, handleElysia };
}
