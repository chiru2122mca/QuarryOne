import { mockCustomers } from "../mockCustomers";
import type { BlockCustomer, Pit, Quarry } from "../../domain/blocks/types";

export const mockQuarries: readonly Quarry[] = Object.freeze([
  Object.freeze({ id: "quarry-deccan", name: "Deccan Stone Quarry" }),
]);
export const mockPits: readonly Pit[] = Object.freeze([
  Object.freeze({ id: "pit-a", quarryId: "quarry-deccan", name: "Pit A" }),
  Object.freeze({ id: "pit-b", quarryId: "quarry-deccan", name: "Pit B" }),
]);
/** Reuse the existing four customer names without changing legacy screen records. */
export const blockCustomers: readonly BlockCustomer[] = Object.freeze(
  mockCustomers.map((customer, index) =>
    Object.freeze({ id: `customer-${index + 1}`, name: customer.name }),
  ),
);
