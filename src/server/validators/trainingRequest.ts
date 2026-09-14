import { z } from "zod";

export const trainingRequestSchema = z.object({
  requestedDate: z.coerce.date(),
  startTime: z.string().min(1).max(10),
  endTime: z.string().max(10).optional().nullable(),
  location: z.string().max(150).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const trainingRequestReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional().nullable(),
});
