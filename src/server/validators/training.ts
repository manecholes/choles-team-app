import { z } from "zod";

export const trainingSessionSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  startTime: z.string().min(1).max(10),
  endTime: z.string().min(1).max(10),
  location: z.string().max(150).optional().nullable(),
  objective: z.string().max(300).optional().nullable(),
  content: z.string().max(3000).optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().max(480),
  observations: z.string().max(2000).optional().nullable(),
});

export const attendanceRecordSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
  note: z.string().max(300).optional().nullable(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
});

export const attendanceBatchSchema = z.object({
  records: z.array(attendanceRecordSchema).min(1),
});
