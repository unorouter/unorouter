export type DashToUnderscore<S extends string> = S extends `${infer A}-${infer B}`
  ? `${A}_${B}`
  : S;
