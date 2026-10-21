import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSimulationInput, DashboardStatsDto, Paginated, SimulationDetailDto, SimulationSummaryDto } from "@osmoguard/contracts";
import type { AlertConfig, SimulationOutput, SimulationRequestRaw, Solution, FormulaUsed, Reference } from "@osmoguard/engine";
import { api } from "./api";

export interface EngineInfo {
  name: string;
  version: string;
  solutions: Solution[];
  lossTypes: Record<string, { label: string; nominal: number; low: number; high: number }>;
  defaultAlertConfig: AlertConfig;
  formulas: FormulaUsed[];
  assumptions: string[];
  references: Reference[];
  disclaimer: string;
}

export const useEngineInfo = () =>
  useQuery({ queryKey: ["engine-info"], queryFn: () => api<EngineInfo>("/engine/info", { auth: false }), staleTime: 60 * 60_000 });

export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => api<DashboardStatsDto>("/simulations/stats") });

export const useSimulations = (q: string, page: number) =>
  useQuery({
    queryKey: ["simulations", q, page],
    queryFn: () => api<Paginated<SimulationSummaryDto>>(`/simulations?${new URLSearchParams({ q, page: String(page), pageSize: "12" })}`),
    placeholderData: (prev) => prev,
  });

export const useSimulation = (id: string | undefined) =>
  useQuery({ queryKey: ["simulation", id], queryFn: () => api<SimulationDetailDto>(`/simulations/${id}`), enabled: !!id });

export const usePreview = () => useMutation({ mutationFn: (req: SimulationRequestRaw) => api<SimulationOutput>("/simulations/preview", { method: "POST", json: req }) });

export function useCreateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSimulationInput) => api<SimulationDetailDto>("/simulations", { method: "POST", json: input }),
    onSuccess: (sim) => {
      qc.setQueryData(["simulation", sim.id], sim);
      void qc.invalidateQueries({ queryKey: ["simulations"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDuplicateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<SimulationDetailDto>(`/simulations/${id}/duplicate`, { method: "POST" }),
    onSuccess: (sim) => {
      qc.setQueryData(["simulation", sim.id], sim);
      void qc.invalidateQueries({ queryKey: ["simulations"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/simulations/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["simulation", id] });
      void qc.invalidateQueries({ queryKey: ["simulations"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useTool<TOut>(module: "acid-base" | "osmolality" | "potassium" | "calcium") {
  return useMutation({ mutationFn: (input: unknown) => api<TOut>(`/tools/${module}`, { method: "POST", json: input }) });
}
