/// <reference types="react" />
/// <reference types="react-dom" />

declare module "react" {
  export = React;
  export as namespace React;
}

declare module "react-dom" {
  export = ReactDOM;
  export as namespace ReactDOM;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module "react/jsx-dev-runtime" {
  export const jsxDEV: any;
  export const Fragment: any;
}