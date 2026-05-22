// Ambient module declarations for asset side-effect imports.
// Next.js handles bundling — TypeScript just needs to know these resolve.

declare module "*.css";
declare module "*.scss";
declare module "*.module.css" {
  const styles: { readonly [key: string]: string };
  export default styles;
}
