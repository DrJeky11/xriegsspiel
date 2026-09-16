import type { Exercise, Event, Preview } from '../scenario/rules.ts';

export const CAPTURE_SCHEMA = 'xriegsspiel-capture/1';
export type InterfaceMode = 'browser' | 'vr' | 'mr' | 'script' | 'unknown';
export type CompactExercise = Omit<Exercise, 'events'>;
export interface CaptureContext { principalId: string; interface: InterfaceMode }
export interface CaptureState { runId: string; observationId?: string; participantId?: string; participantLabel?: string; capture: 'durable' }
export interface RunSummary {
  id: string; mapId: string; label: string; createdAt: string | null; archivedAt: string | null;
  status: 'active' | 'archived'; endReason: string | null; origin: string; parentRunId: string | null;
  parentRevision: number | null; sourceHash: string | null;
  initialRevision: number; currentRevision: number; manifest: Exercise['manifest']; artifactHash: string;
  objective: string; accepted: number; rejected: number; notes: number; quality: string[];
}
export interface CapturedCommand {
  id: string; runId: string; participantId: string; participantLabel: string; commandId: string;
  operation: unknown; receivedAt: string | null; committedAt: string | null; interface: InterfaceMode;
  status: number; reasonCode: string; explanation: string; expectedRevision: number; validatedRevision: number;
  observationId: string | null; validationObservationId: string | null; beforeHash: string; afterHash: string;
  nextRunId: string | null; retries: number; source: string; guidance: Preview | null;
}
export interface CapturedObservation {
  id: string; runId: string; participantId: string; revision: number; stateHash: string;
  projection: string; issuedAt: string; deliveredAt: string | null; presentedAt: string | null;
  clientTime: string | null; interface: InterfaceMode;
}
export interface Annotation {
  id: string; runId: string; commandId: string | null; author: string; authorLabel: string;
  kind: 'intent' | 'assumption' | 'reflection' | 'assessment'; text: string; audience: 'exercise' | 'private';
  createdAt: string; timing: 'retrospective' | 'during-exercise' | 'before-resolution'; rubric: string | null;
}
export interface RunReview {
  run: RunSummary; commands: CapturedCommand[]; observations: CapturedObservation[]; annotations: Annotation[];
  checkpoints: { revision: number; stateHash: string; turn: number; createdAt: string | null }[];
  initialEvents: Event[]; participants: { id: string; label: string; kind: string }[];
  telemetry: { type: string; count: number }[];
}
