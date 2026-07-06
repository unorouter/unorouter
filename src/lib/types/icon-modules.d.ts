type LazyIconComponent = import("react").ComponentType<
  import("react").SVGAttributes<SVGElement> & { size?: number | string }
>;

declare module "lucide-react/dist/esm/icons/*.mjs" {
  const Icon: LazyIconComponent;
  export default Icon;
}

declare module "@tabler/icons-react/dist/esm/icons/*.mjs" {
  const Icon: LazyIconComponent;
  export default Icon;
}

declare module "iconoir-react/regular/*" {
  const Icon: LazyIconComponent;
  export default Icon;
}
