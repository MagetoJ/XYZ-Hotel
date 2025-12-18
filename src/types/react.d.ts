/// <reference types="react" />
/// <reference types="react-dom" />

// For React 19 compatibility with explicit re-exports
declare module "react" {
  // Export hooks explicitly
  export function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, React.Dispatch<React.SetStateAction<S | undefined>>];
  export function useEffect(effect: React.EffectCallback, deps?: React.DependencyList): void;
  export function useContext<T>(context: React.Context<T>): T;
  export function createContext<T>(defaultValue: T): React.Context<T>;
  
  // Export components
  export const StrictMode: React.ComponentType<{ children?: React.ReactNode }>;
  
  // Export types
  export type ReactNode = any;
  export type ComponentType<P = {}> = React.ComponentClass<P, any> | React.FunctionComponent<P>;
  export type FC<P = {}> = React.FunctionComponent<P>;
  
  // Default export for React
  const React: typeof import('react');
  export default React;
}