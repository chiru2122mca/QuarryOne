import { useSyncExternalStore } from "react";
import { mockOperationsStore } from "./mockOperationsStore";
import type { BlockOperationsStore } from "./mockOperationsStore";

/** Opt-in React adapter; deliberately not connected to existing screens. */
export function useMockOperations(
  store: BlockOperationsStore = mockOperationsStore,
) {
  const inventory = useSyncExternalStore(
    store.subscribe,
    store.getInventory,
    store.getInitialInventory,
  );
  return {
    inventory,
    addBlock: store.addBlock,
    getBlockById: store.getBlockById,
    resetDemoData: store.resetDemoData,
  };
}
