export async function getRpc() {
  const { rpc } = await import("@/lib/rpc");
  return rpc;
}
