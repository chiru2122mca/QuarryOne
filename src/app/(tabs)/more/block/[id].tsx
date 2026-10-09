import { mockBlocks } from "../../../../data/blocks/mockBlocks";
export { default } from "../../../../screens/BlockDetails";

/** Pre-render seed details for the local static preview; session-only IDs resolve at runtime. */
export function generateStaticParams() {
  return mockBlocks.map((block) => ({ id: block.id }));
}
