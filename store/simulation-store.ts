import { create } from 'zustand';
import { SimulationInput, SimulationResult, DEFAULT_SIMULATION_INPUT } from '@/lib/api/contract';
import { calculateMockSimulation } from '@/lib/engine/mock-engine';

interface SimulationState {
  input: SimulationInput;
  result: SimulationResult;
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

export const useSimulationStore = create<SimulationState>((set, get) => ({
  input: DEFAULT_SIMULATION_INPUT,
  result: calculateMockSimulation(DEFAULT_SIMULATION_INPUT),
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

    const result = calculateMockSimulation(updated);
    set({ input: updated, result });
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
      result: calculateMockSimulation(DEFAULT_SIMULATION_INPUT),
      demoModeActive: false,
      demoStep: 0
    });
  }
}));
