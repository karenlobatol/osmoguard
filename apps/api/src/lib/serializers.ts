import { DEFAULT_ALERT_CONFIG, ENGINE_VERSION, alertConfigSchema, type AlertConfig, type SimulationOutput } from "@osmoguard/engine";
import type { SimulationDetailDto, SimulationSummaryDto, UserDto } from "@osmoguard/contracts";
import type { Simulation, SimulationResult, SimulationScenario, User } from "@prisma/client";
import type { FieldCipher } from "./crypto";

export function userAlertConfig(user: Pick<User, "alertConfig">): AlertConfig {
  const parsed = alertConfigSchema.safeParse(user.alertConfig ?? {});
  return parsed.success ? parsed.data : DEFAULT_ALERT_CONFIG;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profession: user.profession,
    role: user.role,
    alertConfig: userAlertConfig(user),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toSummary(sim: Simulation & { _count?: { scenarios: number }; scenarios?: unknown[] }): SimulationSummaryDto {
  return {
    id: sim.id,
    title: sim.title,
    classification: sim.classification as SimulationSummaryDto["classification"],
    status: sim.status as SimulationSummaryDto["status"],
    serumSodium: Number(sim.serumSodium),
    scenarioCount: sim._count?.scenarios ?? sim.scenarios?.length ?? 0,
    engineVersion: sim.engineVersion,
    createdAt: sim.createdAt.toISOString(),
  };
}

type FullSimulation = Simulation & { scenarios: (SimulationScenario & { result: SimulationResult | null })[] };

export function toDetail(sim: FullSimulation, cipher: FieldCipher): SimulationDetailDto {
  const patient = cipher.decryptJson<SimulationDetailDto["request"]["patient"]>(sim.patientEnc);
  const ordered = [...sim.scenarios].sort((a, b) => a.position - b.position);
  const assessment = sim.assessment as unknown as Omit<SimulationOutput, "scenarios">;
  return {
    ...toSummary(sim),
    notes: sim.notesEnc ? cipher.decrypt(sim.notesEnc) : null,
    request: {
      patient,
      alertConfig: sim.alertConfig as unknown as AlertConfig,
      scenarios: ordered.map((s) => ({
        label: s.label,
        solutionId: s.solutionId,
        rateMlH: Number(s.rateMlH),
        horizonHours: s.horizonHours,
      })),
    },
    output: {
      ...assessment,
      scenarios: ordered.map((s) => s.result!.output as unknown as SimulationOutput["scenarios"][number]),
    },
    engineOutdated: sim.engineVersion !== ENGINE_VERSION,
  };
}
