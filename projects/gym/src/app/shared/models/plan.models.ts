export interface Plan {
  planId: number;
  title: string;
  description: string;
  cost: number;
  durationInDays: number;
  isActive: boolean;
  allowedFreezeCount: number;
  maxTotalFreezeDays: number;
}

export interface CreatePlanRequest {
  title: string;
  description: string;
  cost: number;
  durationInDays: number;
  allowedFreezeCount: number;
  maxTotalFreezeDays: number;
}

export type UpdatePlanRequest = CreatePlanRequest;
