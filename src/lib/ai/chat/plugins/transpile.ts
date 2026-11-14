// Imported lazily so sucrase stays out of the first-paint bundle.
export async function transpilePluginCode(code: string): Promise<string> {
  const { transform } = await import("sucrase");
  return transform(code, { transforms: ["typescript"] }).code;
}
