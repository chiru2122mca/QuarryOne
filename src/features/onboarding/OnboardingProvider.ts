import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { Dispatch, ReactNode } from "react";
import { createOnboardingState, onboardingReducer } from "./model";
import type { OnboardingAction, OnboardingState } from "./model";

export const OnboardingContext = createContext<{
  state: OnboardingState;
  dispatch: Dispatch<OnboardingAction>;
} | null>(null);

/** Session-only wizard state, independent of operational inventory and Auth. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    onboardingReducer,
    undefined,
    createOnboardingState,
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return createElement(OnboardingContext.Provider, { value }, children);
}
export function useOnboardingDraft() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("OnboardingProvider is required");
  return value;
}
