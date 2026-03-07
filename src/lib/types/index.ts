export type UnwrapApiResponse<T> = T extends {
  success: boolean;
  data: infer D;
}
  ? D
  : T;
