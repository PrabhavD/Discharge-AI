import { z } from "zod";

export const ReadinessRationaleSchema = z.object({
  statement: z.string(),
  type: z.enum(["fact", "suggestion"]),
  sourceEvidenceIds: z.array(z.string()).optional(),
});

export const DomainStatusSchema = z.object({
  domain: z.string(),
  status: z.enum(["GREEN", "AMBER", "RED", "GREY", "BLUE"]),
  ownerRole: z.string(),
  summary: z.string(),
  actionRequired: z.string().optional(),
  rationale: z.string().optional(),
  confidence: z.number().min(0).max(1),
  sourceEvidenceIds: z.array(z.string()).optional(),
});

export const TaskProposalSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE", "NOT_APPLICABLE"]).default("NOT_STARTED"),
  ownerRole: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueAt: z.string().nullable().optional(),
});

export const BlockerProposalSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE", "NOT_APPLICABLE"]).default("BLOCKED"),
  ownerRole: z.string(),
  escalationRoute: z.string().optional(),
});

export const MissingInformationSchema = z.object({
  domain: z.string(),
  question: z.string(),
  requiredRole: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

export const SafetyConcernSchema = z.object({
  domain: z.string(),
  concern: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  recommendedAction: z.string(),
});

export const DraftDocumentProposalSchema = z.object({
  type: z.string(),
  title: z.string(),
  content: z.string(),
});

export const DischargePlanJsonSchema = z.object({
  overallStatus: z.enum(["GREEN", "AMBER", "RED", "GREY", "BLUE"]),
  summary: z.string(),
  readinessRationale: z.array(ReadinessRationaleSchema).default([]),
  domains: z.array(DomainStatusSchema),
  tasks: z.array(TaskProposalSchema).default([]),
  blockers: z.array(BlockerProposalSchema).default([]),
  missingInformation: z.array(MissingInformationSchema).default([]),
  safetyConcerns: z.array(SafetyConcernSchema).default([]),
  draftDocuments: z.array(DraftDocumentProposalSchema).default([]),
  confidence: z.number().min(0).max(1),
  uncertainty: z.array(z.string()).default([]),
  finalDecisionRequired: z.literal(true),
  humanApprovalRequired: z.literal(true),
});

export type DischargePlanJson = z.infer<typeof DischargePlanJsonSchema>;

export const ReadinessSummaryJsonSchema = z.object({
  overallStatus: z.enum(["GREEN", "AMBER", "RED", "GREY", "BLUE"]),
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  missingInformation: z.array(MissingInformationSchema).default([]),
  safetyConcerns: z.array(SafetyConcernSchema).default([]),
  confidence: z.number().min(0).max(1),
  uncertainty: z.array(z.string()).default([]),
  finalDecisionRequired: z.literal(true),
  humanApprovalRequired: z.literal(true),
});

export type ReadinessSummaryJson = z.infer<typeof ReadinessSummaryJsonSchema>;
