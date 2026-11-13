import { create } from 'zustand';
import { SimulationInput, SimulationResult, DEFAULT_SIMULATION_INPUT } from '@/lib/api/contract';
import { calculateMockSimulation } from '@/lib/engine';

interface SimulationState {
  input: SimulationInput;
  result: SimulationResult;
  performanceMs: number;
  isRecalculating: boolean;
  demoModeActive: boolean;
  demoStep: number;
  
  // Actions
  setInput: (partial: Partial<SimulationInput>) => void;
  setScenario: (scenario: SimulationInput['scenario']) => void;
  toggleAdaptation: (key: keyof SimulationInput['adaptation']) => void;
  toggleDemoMode: () => void;
  setDemoStep: (step: number) => void;
  reset: () => void;
}

type TimedSimulation = { result: SimulationResult; performanceMs: number };

let cachedSimulationKey: string | undefined;
let cachedSimulation: TimedSimulation | undefined;

function getSimulationKey(input: SimulationInput): string {
  return JSON.stringify({
    hectares: input.hectares,
    sumInsured: input.sumInsured,
    strikeMm: input.strikeMm,
    exitMm: input.exitMm,
    adaptation: input.adaptation,
    safetyLoading: input.safetyLoading,
    expenseRatio: input.expenseRatio,
    scenario: input.scenario,
    customRainMm: input.scenario === 'custom' ? input.customRainMm : undefined,
    portfolio: {
      policies: input.portfolio?.policies ?? 1000,
      fixedCost: input.portfolio?.fixedCost ?? 60000,
      variableCost: input.portfolio?.variableCost ?? 20,
    },
  });
}

function calculateTimedSimulation(input: SimulationInput): TimedSimulation {
  const key = getSimulationKey(input);
  if (key === cachedSimulationKey && cachedSimulation) return cachedSimulation;

  const startedAt = performance.now();
  const result = calculateMockSimulation(input);
  const performanceMs = performance.now() - startedAt;

  cachedSimulationKey = key;
  cachedSimulation = { result, performanceMs };
  return cachedSimulation;
}

function inputsAreEqual(left: SimulationInput, right: SimulationInput): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

const initialSimulation = calculateTimedSimulation(DEFAULT_SIMULATION_INPUT);

export const useSimulationStore = create<SimulationState>((set, get) => ({
  input: DEFAULT_SIMULATION_INPUT,
  ...initialSimulation,
  isRecalculating: false,
  demoModeActive: false,
  demoStep: 0,

  setInput: (partial) => {
    const current = get().input;
    const updated: SimulationInput = { ...current, ...partial };

    // Regla de validación: S (exitMm) debe ser estrictamente mayor que K (strikeMm)
    if (updated.exitMm <= updated.strikeMm) {
      updated.exitMm = updated.strikeMm + 50;
    }

    if (inputsAreEqual(current, updated)) return;

    set({ input: updated, ...calculateTimedSimulation(updated) });
  },

  setScenario: (scenario) => {
    get().setInput({ scenario });
  },

  toggleAdaptation: (key) => {
    const currentAdapt = get().input.adaptation;
    get().setInput({
      adaptation: {
        ...currentAdapt,
        [key]: !currentAdapt[key]
      }
    });
  },

  toggleDemoMode: () => {
    set((state) => ({ demoModeActive: !state.demoModeActive, demoStep: 0 }));
  },

  setDemoStep: (step) => {
    set({ demoStep: step });
  },

  reset: () => {
    set({
      input: DEFAULT_SIMULATION_INPUT,
      ...calculateTimedSimulation(DEFAULT_SIMULATION_INPUT),
      demoModeActive: false,
      demoStep: 0
    });
  }
}));
