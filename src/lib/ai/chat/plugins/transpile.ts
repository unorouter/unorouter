// Plugin authors write TypeScript often enough that the editor accepts it; the
// sandbox only ever runs plain JS. Sucrase strips types without type-checking,
// and is imported lazily so it never lands in the first-paint bundle.
export async function transpilePluginCode(code: string): Promise<string> {
  const { transform } = await import("sucrase");
  return transform(code, { transforms: ["typescript"] }).code;
}
