// Type declarations for Vite-specific imports

/** CSS files imported with ?inline suffix return their content as a string */
declare module '*.css?inline' {
  const css: string;
  export default css;
}

/** CSS modules */
declare module '*.css' {
  const css: string;
  export default css;
}
