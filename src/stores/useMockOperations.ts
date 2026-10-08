import { useContext, useSyncExternalStore } from "react";
import { mockOperationsStore } from "./mockOperationsStore";
import type { BlockOperationsStore } from "./mockOperationsStore";
import { OperationsContext } from "./OperationsProvider";

/** All Production routes subscribe to the same root-provided session store. */
export function useMockOperations(override?: BlockOperationsStore) {
  const provided = useContext(OperationsContext);
  const store = override ?? provided ?? mockOperationsStore;
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
