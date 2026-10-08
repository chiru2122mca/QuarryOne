import { mockBlocks } from "../data/blocks/mockBlocks";
import { mockPits, mockQuarries } from "../data/blocks/referenceData";
import {
  createOperationsState,
  operationsReducer,
} from "../domain/blocks/operationsReducer";
import type {
  BlockReferences,
  OperationsAction,
  OperationsState,
} from "../domain/blocks/operationsReducer";
import type {
  AddBlockInput,
  BlockId,
  GraniteBlock,
} from "../domain/blocks/types";

/** The small contract later adapters can implement without coupling the domain to React. */
export interface BlockOperationsStore {
  getInventory(): readonly GraniteBlock[];
  getInitialInventory(): readonly GraniteBlock[];
  getBlockById(id: BlockId): GraniteBlock | undefined;
  addBlock(input: AddBlockInput): GraniteBlock;
  resetDemoData(): void;
  subscribe(listener: () => void): () => void;
}

export function createMockOperationsStore(
  seed: readonly GraniteBlock[] = mockBlocks,
  references: BlockReferences = { quarries: mockQuarries, pits: mockPits },
): BlockOperationsStore {
  let state = createOperationsState(seed, references);
  const listeners = new Set<() => void>();
  function apply(action: OperationsAction): OperationsState {
    // Reducer validates before assignment, keeping invalid commands atomic.
    const next = operationsReducer(state, action);
    state = next;
    for (const listener of [...listeners]) listener();
    return next;
  }
  return Object.freeze({
    getInventory: () => state.inventory,
    getInitialInventory: () => state.seed,
    getBlockById: (id: BlockId) =>
      state.inventory.find((block) => block.id === id),
    addBlock: (input: AddBlockInput) => {
      const next = apply({ type: "ADD_BLOCK", input });
      return next.inventory[next.inventory.length - 1];
    },
    resetDemoData: () => {
      apply({ type: "RESET_DEMO" });
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}

/** One shared demo inventory. No existing route imports or mounts this foundation yet. */
export const mockOperationsStore = createMockOperationsStore();
