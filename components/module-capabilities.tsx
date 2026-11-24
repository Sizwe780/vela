"use client";
import { createContext, useContext, type ReactNode } from "react";
import { universalCapabilities, type ModuleCapabilities } from "../lib/capabilities";
const Context = createContext<ModuleCapabilities>(universalCapabilities);
export const useModuleCapabilities = () => useContext(Context);
export function ModuleCapabilitiesProvider({
  capabilities,
  children,
}: {
  capabilities: ModuleCapabilities;
  children: ReactNode;
}) {
  return <Context.Provider value={capabilities}>{children}</Context.Provider>;
}
