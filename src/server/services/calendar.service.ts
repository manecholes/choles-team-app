import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { calendarEventSchema } from "@/server/validators/calendar";

type CalendarEventInput = z.infer<typeof calendarEventSchema>;

export async function listEvents(
  clubId: number,
  filters: { start?: Date; end?: Date; teamId?: number; type?: string } = {}
) {
  const where: any = { clubId };
  if (filters.start || filters.end) {
    where.startAt = {};
    if (filters.start) where.startAt.gte = filters.start;
    if (filters.end) where.startAt.lte = filters.end;
  }
  if (filters.teamId) where.teamId = filters.teamId;
  if (filters.type) where.type = filters.type;

  return prisma.calendarEvent.findMany({
    where,
    include: { team: { select: { id: true, name: true } } },
    orderBy: { startAt: "asc" },
  });
}

function addInterval(date: Date, rule: string, times: number): Date {
  const d = new Date(date);
  if (rule === "WEEKLY") d.setDate(d.getDate() + 7 * times);
  else if (rule === "BIWEEKLY") d.setDate(d.getDate() + 14 * times);
  else if (rule === "MONTHLY") d.setMonth(d.getMonth() + times);
  return d;
}

/** Crea un evento (y sus repeticiones, si aplica). Retorna todos los eventos creados. */
export async function createEvent(clubId: number, createdById: number, data: CalendarEventInput) {
  const count = data.recurrenceRule && data.recurrenceRule !== "NONE" ? data.recurrenceCount ?? 1 : 1;
  const durationMs = data.endAt.getTime() - data.startAt.getTime();

  const events = [];
  for (let i = 0; i < count; i++) {
    const startAt = i === 0 ? data.startAt : addInterval(data.startAt, data.recurrenceRule ?? "NONE", i);
    const endAt = new Date(startAt.getTime() + durationMs);
    const event = await prisma.calendarEvent.create({
      data: {
        clubId,
        title: data.title,
        type: data.type,
        startAt,
        endAt,
        location: data.location || null,
        teamId: data.teamId || null,
        categoryId: data.categoryId || null,
        description: data.description || null,
        recurrenceRule: data.recurrenceRule && data.recurrenceRule !== "NONE" ? data.recurrenceRule : null,
        createdById,
      },
    });
    events.push(event);
  }
  return events;
}

export async function updateEvent(clubId: number, id: number, data: CalendarEventInput) {
  await prisma.calendarEvent.findFirstOrThrow({ where: { id, clubId } });
  return prisma.calendarEvent.update({
    where: { id },
    data: {
      title: data.title,
      type: data.type,
      startAt: data.startAt,
      endAt: data.endAt,
      location: data.location || null,
      teamId: data.teamId || null,
      categoryId: data.categoryId || null,
      description: data.description || null,
    },
  });
}

export async function deleteEvent(clubId: number, id: number) {
  const event = await prisma.calendarEvent.findFirstOrThrow({ where: { id, clubId } });
  if (event.trainingSessionId || event.matchId) {
    throw new Error(
      "Este evento esta vinculado a un entrenamiento o partido. Eliminalo desde el modulo correspondiente."
    );
  }
  await prisma.calendarEvent.delete({ where: { id } });
}
