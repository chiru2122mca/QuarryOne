import { createContext, createElement } from "react";
import type { ReactNode } from "react";
import { mockOperationsStore } from "./mockOperationsStore";
import type { BlockOperationsStore } from "./mockOperationsStore";

export const OperationsContext = createContext<BlockOperationsStore | null>(
  null,
);

/** Supplies the existing session singleton, never creates a store during rendering. */
export function OperationsProvider({
  children,
  store = mockOperationsStore,
}: {
  children: ReactNode;
  store?: BlockOperationsStore;
}) {
  return createElement(OperationsContext.Provider, { value: store }, children);
}
