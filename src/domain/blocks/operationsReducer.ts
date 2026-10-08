import {
  blockSequence,
  createGraniteBlock,
  formatBlockNumber,
  productionYear,
} from "./block";
import type { AddBlockInput, GraniteBlock, Pit, Quarry } from "./types";

export interface BlockReferences {
  readonly quarries: readonly Quarry[];
  readonly pits: readonly Pit[];
}
export interface OperationsState {
  readonly inventory: readonly GraniteBlock[];
  readonly seed: readonly GraniteBlock[];
  readonly references: BlockReferences;
  readonly nextSequence: number;
  /** Retained across reset to prevent reusing identities issued in this session. */
  readonly issuedIds: readonly string[];
  readonly issuedNumbers: readonly string[];
}
export type OperationsAction =
  | { readonly type: "ADD_BLOCK"; readonly input: AddBlockInput }
  | { readonly type: "RESET_DEMO" };

function validateReferences(
  block: GraniteBlock,
  references: BlockReferences,
): void {
  if (!references.quarries.some((q) => q.id === block.quarryId))
    throw new Error("Unknown quarry.");
  if (
    !references.pits.some(
      (p) => p.id === block.pitId && p.quarryId === block.quarryId,
    )
  ) {
    throw new Error("Pit does not belong to the selected quarry.");
  }
}
export function createOperationsState(
  seed: readonly GraniteBlock[],
  references: BlockReferences,
): OperationsState {
  const catalog: BlockReferences = Object.freeze({
    quarries: Object.freeze(
      references.quarries.map((q) => Object.freeze({ ...q })),
    ),
    pits: Object.freeze(references.pits.map((p) => Object.freeze({ ...p }))),
  });
  const ids = new Set<string>(),
    numbers = new Set<string>();
  let nextSequence = 1;
  const inventory = Object.freeze(
    seed.map((record) => {
      const status = record.status;
      if (status !== "AVAILABLE" && status !== "REJECTED")
        throw new Error(
          "Foundation seed cannot include reservation or dispatch history.",
        );
      const block = createGraniteBlock({ ...record, status });
      validateReferences(block, catalog);
      if (ids.has(block.id)) throw new Error("Duplicate block ID in seed.");
      if (numbers.has(block.blockNumber))
        throw new Error("Duplicate block number in seed.");
      ids.add(block.id);
      numbers.add(block.blockNumber);
      nextSequence = Math.max(
        nextSequence,
        blockSequence(block.blockNumber) + 1,
      );
      return block;
    }),
  );
  return Object.freeze({
    inventory,
    seed: inventory,
    references: catalog,
    nextSequence,
    issuedIds: Object.freeze([...ids]),
    issuedNumbers: Object.freeze([...numbers]),
  });
}

/** Pure atomic transitions: invalid additions throw without mutating the prior state. */
export function operationsReducer(
  state: OperationsState,
  action: OperationsAction,
): OperationsState {
  if (action.type === "RESET_DEMO")
    return Object.freeze({ ...state, inventory: state.seed });
  const input = action.input;
  const year = productionYear(input.productionDate);
  let sequence = state.nextSequence;
  let generatedNumber = formatBlockNumber(year, sequence);
  let generatedId = `block-${year}-${String(sequence).padStart(4, "0")}`;
  while (
    state.issuedNumbers.includes(generatedNumber) ||
    state.issuedIds.includes(generatedId)
  ) {
    sequence += 1;
    generatedNumber = formatBlockNumber(year, sequence);
    generatedId = `block-${year}-${String(sequence).padStart(4, "0")}`;
  }
  const block = createGraniteBlock({
    ...input,
    id: input.id ?? generatedId,
    blockNumber: input.blockNumber ?? generatedNumber,
  });
  if (state.issuedIds.includes(block.id))
    throw new Error("Duplicate block ID: already issued in this demo session.");
  if (state.issuedNumbers.includes(block.blockNumber))
    throw new Error(
      "Duplicate block number: already issued in this demo session.",
    );
  validateReferences(block, state.references);
  return Object.freeze({
    ...state,
    inventory: Object.freeze([...state.inventory, block]),
    nextSequence: Math.max(sequence + 1, blockSequence(block.blockNumber) + 1),
    issuedIds: Object.freeze([...state.issuedIds, block.id]),
    issuedNumbers: Object.freeze([...state.issuedNumbers, block.blockNumber]),
  });
}
