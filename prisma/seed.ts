/**
 * Seed de datos demo (punto 28 del maestro).
 *
 * Ejecutar con: npm run db:seed
 * (requiere que las migraciones ya se hayan aplicado: npm run db:migrate)
 *
 * Crea: 1 super admin (bonus, para demostrar el modelo multi-club), 1
 * administrador de Choles Team, 3 entrenadores, 1 delegado, 5 categorias,
 * 5 equipos, 30 jugadores con sus padres/tutores, entrenamientos con
 * asistencia, partidos con estadisticas, un torneo con fixture generado
 * automaticamente, conceptos y pagos (con cartera realista), evaluaciones
 * deportivas y comunicaciones.
 *
 * Todas las contrasenas demo se listan tambien en README.md, marcadas
 * exclusivamente para entorno de desarrollo. El administrador del club
 * queda con mustChangePassword=true para forzar el cambio en el primer
 * login (punto 28).
 */

import { PrismaClient, Branch, Sex, PlayerStatus, AttendanceStatus, PaymentMethod, PaymentStatus, PaymentConceptType, PhysicalTestCategory, EventType, MatchStatus, TournamentStatus, AudienceType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateRoundRobin, splitIntoGroups } from "../src/server/logic/fixtures";
import { computeInternalLoad } from "../src/server/logic/load";
import { ROLE_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Generador pseudoaleatorio determinista (mismo seed -> mismos datos siempre)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260827);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

const FIRST_NAMES_M = ["Santiago", "Mateo", "Samuel", "Juan Jose", "David", "Nicolas", "Andres", "Sebastian", "Emmanuel", "Kevin", "Cristian", "Daniel", "Miguel", "Jeronimo", "Esteban"];
const FIRST_NAMES_F = ["Maria Jose", "Valentina", "Isabella", "Sofia", "Salome", "Mariana", "Luciana", "Antonella", "Gabriela", "Camila", "Daniela", "Valeria", "Emily", "Laura", "Paula"];
const LAST_NAMES = ["Gomez", "Rodriguez", "Martinez", "Lopez", "Garcia", "Hernandez", "Perez", "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gonzalez", "Diaz", "Morales", "Ortiz", "Castro", "Vargas", "Romero", "Suarez"];

async function main() {
  console.log("Seed: iniciando...");

  // -----------------------------------------------------------------------
  // 0. Roles y permisos (reflejo de src/lib/permissions.ts en la BD, para
  //    que en el futuro un super_admin pueda administrar permisos desde la UI)
  // -----------------------------------------------------------------------
  const roleDescriptions: Record<string, string> = {
    SUPER_ADMIN: "Acceso total a la plataforma y a todos los clubes",
    ADMIN: "Administrador del club",
    COACH: "Entrenador de uno o varios equipos",
    DELEGATE: "Delegado de categoria/equipo",
    GUARDIAN: "Padre, madre o tutor de uno o varios jugadores",
    PLAYER: "Jugador",
  };
  const allPermissionKeys = new Set<string>();
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) if (p !== "*") allPermissionKeys.add(p);
  }
  const permissionRecords = await Promise.all(
    Array.from(allPermissionKeys).map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } })
    )
  );
  const permissionByKey = new Map(permissionRecords.map((p) => [p.key, p]));

  for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: {},
      create: { key: roleKey, name: roleKey, description: roleDescriptions[roleKey] },
    });
    if (perms.includes("*")) continue; // SUPER_ADMIN: acceso total, no necesita filas explicitas
    for (const permKey of perms) {
      const permission = permissionByKey.get(permKey);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // -----------------------------------------------------------------------
  // 1. Club
  // -----------------------------------------------------------------------
  const club = await prisma.club.upsert({
    where: { slug: "choles-team" },
    update: {},
    create: {
      name: "Choles Team",
      slug: "choles-team",
      primaryColor: "#123852",
      active: true,
    },
  });

  // -----------------------------------------------------------------------
  // 2. Usuarios base (super admin, admin, entrenadores, delegado)
  // -----------------------------------------------------------------------
  const superAdminPassword = "SuperAdmin123!";
  await prisma.user.upsert({
    where: { email: "superadmin@cholessports.com" },
    update: {},
    create: {
      email: "superadmin@cholessports.com",
      passwordHash: await hash(superAdminPassword),
      role: "SUPER_ADMIN",
      mustChangePassword: true,
      clubId: null,
    },
  });

  const adminPassword = "Admin123!";
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@cholesteam.com" },
    update: {},
    create: {
      email: "admin@cholesteam.com",
      passwordHash: await hash(adminPassword),
      role: "ADMIN",
      mustChangePassword: true,
      clubId: club.id,
    },
  });

  const coachDefs = [
    { firstName: "Carlos", lastName: "Ramirez", email: "coach1@cholesteam.com", specialty: "Formacion basica" },
    { firstName: "Diana", lastName: "Torres", email: "coach2@cholesteam.com", specialty: "Rendimiento fisico" },
    { firstName: "Julian", lastName: "Restrepo", email: "coach3@cholesteam.com", specialty: "Tactica y competencia" },
  ];
  const coachPassword = "Coach123!";
  const coaches = [];
  for (const c of coachDefs) {
    const coach = await prisma.coach.create({
      data: {
        clubId: club.id,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: `300${randInt(1000000, 9999999)}`,
        email: c.email,
        specialty: c.specialty,
      },
    });
    await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: await hash(coachPassword),
        role: "COACH",
        mustChangePassword: true,
        clubId: club.id,
        coachId: coach.id,
      },
    });
    coaches.push(coach);
  }

  const delegate = await prisma.delegate.create({
    data: {
      clubId: club.id,
      firstName: "Marta",
      lastName: "Gomez",
      phone: `301${randInt(1000000, 9999999)}`,
      email: "delegado1@cholesteam.com",
    },
  });
  await prisma.user.upsert({
    where: { email: "delegado1@cholesteam.com" },
    update: {},
    create: {
      email: "delegado1@cholesteam.com",
      passwordHash: await hash("Delegado123!"),
      role: "DELEGATE",
      mustChangePassword: true,
      clubId: club.id,
      delegateId: delegate.id,
    },
  });

  // -----------------------------------------------------------------------
  // 3. Temporada
  // -----------------------------------------------------------------------
  const season = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "Temporada 2026",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-12-15"),
      active: true,
    },
  });

  // -----------------------------------------------------------------------
  // 4. Categorias (5) y Equipos (5)
  // -----------------------------------------------------------------------
  const categoryDefs = [
    { name: "U10", minAge: 8, maxAge: 10, branch: Branch.MIXTO, coach: coaches[0], schedule: "Mar y Jue 4:00pm - 5:30pm", court: "Cancha 1" },
    { name: "U12", minAge: 11, maxAge: 12, branch: Branch.MASCULINO, coach: coaches[0], schedule: "Lun, Mie y Vie 4:00pm - 6:00pm", court: "Cancha 1" },
    { name: "U14", minAge: 13, maxAge: 14, branch: Branch.FEMENINO, coach: coaches[1], schedule: "Lun, Mie y Vie 5:00pm - 7:00pm", court: "Cancha 2" },
    { name: "U16", minAge: 15, maxAge: 16, branch: Branch.MASCULINO, coach: coaches[1], schedule: "Mar, Jue y Sab 6:00pm - 8:00pm", court: "Cancha 2" },
    { name: "U19", minAge: 17, maxAge: 19, branch: Branch.MASCULINO, coach: coaches[2], schedule: "Lun a Vie 7:00pm - 9:00pm", court: "Coliseo Principal" },
  ];

  const categories = [];
  for (const c of categoryDefs) {
    const category = await prisma.category.create({
      data: {
        clubId: club.id,
        name: c.name,
        minAge: c.minAge,
        maxAge: c.maxAge,
        branch: c.branch,
        coachId: c.coach.id,
        schedule: c.schedule,
        court: c.court,
      },
    });
    categories.push(category);
  }

  const teams = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categoryDefs[i];
    const team = await prisma.team.create({
      data: {
        clubId: club.id,
        name: `Choles ${cat.name}`,
        categoryId: categories[i].id,
        branch: cat.branch,
        coachId: cat.coach.id,
        delegateId: i % 2 === 0 ? delegate.id : null,
        seasonId: season.id,
      },
    });
    teams.push(team);
  }

  // -----------------------------------------------------------------------
  // 5. Jugadores (30, 6 por categoria) + padres/tutores + vinculo a equipo
  // -----------------------------------------------------------------------
  const today = new Date("2026-08-27");
  const guardianPassword = "Padre123!";
  let firstGuardianUserCreated = false;
  const players: { id: number; teamId: number; categoryId: number }[] = [];

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categoryDefs[ci];
    for (let p = 0; p < 6; p++) {
      const isFemale =
        cat.branch === Branch.FEMENINO || (cat.branch === Branch.MIXTO && p % 2 === 0);
      const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
      const lastName = `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
      const age = randInt(cat.minAge, cat.maxAge);
      const birthDate = new Date(today.getFullYear() - age, randInt(0, 11), randInt(1, 28));

      // Un jugador de cada categoria queda con estado especial para poblar alertas del dashboard
      const status: PlayerStatus =
        p === 4 ? PlayerStatus.INJURED : p === 5 && ci === 0 ? PlayerStatus.SUSPENDED : PlayerStatus.ACTIVE;

      const heightCm = isFemale ? randInt(130, 175) : randInt(135, 195);
      const weightKg = Math.round((heightCm / 100) * (heightCm / 100) * randInt(17, 22) * 10) / 10;

      const player = await prisma.player.create({
        data: {
          clubId: club.id,
          firstName,
          lastName,
          documentId: `CC${randInt(1000000000, 1099999999)}`,
          birthDate,
          sex: isFemale ? Sex.F : Sex.M,
          phone: `31${randInt(10000000, 99999999)}`,
          address: `Calle ${randInt(1, 150)} # ${randInt(1, 99)}-${randInt(1, 99)}, Bogota`,
          eps: pick(["Sura", "Nueva EPS", "Sanitas", "Compensar", "Famisanar"]),
          emergencyContactName: `${pick(FIRST_NAMES_M.concat(FIRST_NAMES_F))} ${pick(LAST_NAMES)}`,
          emergencyContactPhone: `30${randInt(10000000, 99999999)}`,
          categoryId: categories[ci].id,
          position: pick(["Base", "Escolta", "Alero", "Ala-Pivot", "Pivot"]),
          heightCm,
          weightKg,
          status,
          joinDate: addDays(new Date("2026-01-15"), randInt(0, 60)),
        },
      });

      await prisma.teamPlayer.create({
        data: {
          teamId: teams[ci].id,
          playerId: player.id,
          seasonId: season.id,
          position: player.position,
          jerseyNumber: p + 1,
        },
      });

      // Guardian (padre/madre/tutor)
      const guardianFirst = pick(FIRST_NAMES_M.concat(FIRST_NAMES_F));
      const guardianLast = lastName.split(" ")[0] + " " + pick(LAST_NAMES); // comparte primer apellido con el jugador
      const guardian = await prisma.guardian.create({
        data: {
          clubId: club.id,
          firstName: guardianFirst,
          lastName: guardianLast,
          documentId: `CC${randInt(10000000, 99999999)}`,
          phone: `32${randInt(10000000, 99999999)}`,
          email: `${guardianFirst.toLowerCase().replace(/\s+/g, "")}.${guardianLast.toLowerCase().split(" ")[0]}${player.id}@example.com`,
          address: player.address,
        },
      });
      await prisma.playerGuardian.create({
        data: {
          playerId: player.id,
          guardianId: guardian.id,
          relationship: pick(["MADRE", "PADRE", "TUTOR"] as const),
          isPrimaryContact: true,
        },
      });

      // Solo el primer jugador tiene un usuario "padre demo" para poder iniciar sesion y ver /mi-hijo
      if (!firstGuardianUserCreated) {
        await prisma.user.create({
          data: {
            email: "familia.demo@example.com",
            passwordHash: await hash(guardianPassword),
            role: "GUARDIAN",
            mustChangePassword: true,
            clubId: club.id,
            guardianId: guardian.id,
          },
        });
        firstGuardianUserCreated = true;
      }

      players.push({ id: player.id, teamId: teams[ci].id, categoryId: categories[ci].id });
    }
  }

  console.log(`Seed: ${players.length} jugadores creados.`);

  // -----------------------------------------------------------------------
  // 6. Entrenamientos + asistencia (4 pasadas + 1 futura, por equipo)
  // -----------------------------------------------------------------------
  for (let ti = 0; ti < teams.length; ti++) {
    const team = teams[ti];
    const teamPlayers = players.filter((p) => p.teamId === team.id);
    const sessionOffsets = [-21, -14, -7, 0, 7]; // 3 pasadas, hoy, 1 futura

    for (const offset of sessionOffsets) {
      const date = addDays(today, offset);
      const session = await prisma.trainingSession.create({
        data: {
          clubId: club.id,
          teamId: team.id,
          coachId: categoryDefs[ti].coach.id,
          date,
          startTime: "16:00",
          endTime: "17:30",
          location: categoryDefs[ti].court,
          objective: offset < 0 ? "Fundamentos de tiro y defensa" : "Preparacion fisica y tactica",
          content: "Calentamiento, trabajo tecnico, situaciones de juego, vuelta a la calma.",
          durationMinutes: 90,
        },
      });

      await prisma.calendarEvent.create({
        data: {
          clubId: club.id,
          title: `Entrenamiento ${team.name}`,
          type: EventType.TRAINING,
          startAt: date,
          endAt: addDays(date, 0),
          location: categoryDefs[ti].court,
          teamId: team.id,
          categoryId: team.categoryId,
          createdById: adminUser.id,
          trainingSessionId: session.id,
        },
      });

      if (offset > 0) continue; // no se pasa asistencia de sesiones futuras

      for (const tp of teamPlayers) {
        const roll = rand();
        const status: AttendanceStatus =
          roll < 0.72 ? AttendanceStatus.PRESENT : roll < 0.82 ? AttendanceStatus.LATE : roll < 0.93 ? AttendanceStatus.ABSENT : AttendanceStatus.EXCUSED;

        await prisma.attendance.create({
          data: { trainingSessionId: session.id, playerId: tp.id, status },
        });

        if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) {
          const rpe = randInt(4, 9);
          const load = computeInternalLoad(rpe, 90);
          await prisma.loadEntry.create({
            data: {
              clubId: club.id,
              playerId: tp.id,
              trainingSessionId: session.id,
              date,
              rpe,
              durationMinutes: 90,
              internalLoad: load,
              recoveryIndex: randInt(5, 9),
            },
          });
        }
      }
    }
  }
  console.log("Seed: entrenamientos y asistencia creados.");

  // -----------------------------------------------------------------------
  // 7. Partidos + estadisticas (2 finalizados + 1 programado, por equipo)
  // -----------------------------------------------------------------------
  const rivalNames = ["Halcones BBC", "Titanes del Norte", "Aguilas Doradas", "Rapidos FC Basket", "Union Baloncesto"];
  for (let ti = 0; ti < teams.length; ti++) {
    const team = teams[ti];
    const teamPlayers = players.filter((p) => p.teamId === team.id);

    const matchDefs = [
      { offset: -20, status: MatchStatus.FINISHED },
      { offset: -10, status: MatchStatus.FINISHED },
      { offset: 6, status: MatchStatus.SCHEDULED },
    ];

    for (const md of matchDefs) {
      const date = addDays(today, md.offset);
      const teamScore = md.status === MatchStatus.FINISHED ? randInt(45, 78) : null;
      const oppScore = md.status === MatchStatus.FINISHED ? randInt(40, 78) : null;

      const match = await prisma.match.create({
        data: {
          clubId: club.id,
          competition: "Liga Local de Baloncesto",
          categoryId: team.categoryId,
          teamId: team.id,
          opponentName: pick(rivalNames),
          date,
          time: "18:00",
          venue: categoryDefs[ti].court,
          isHome: md.offset !== -10,
          resultTeamScore: teamScore,
          resultOpponentScore: oppScore,
          status: md.status,
        },
      });

      await prisma.calendarEvent.create({
        data: {
          clubId: club.id,
          title: `${team.name} vs ${match.opponentName}`,
          type: EventType.MATCH,
          startAt: date,
          endAt: date,
          location: match.venue,
          teamId: team.id,
          categoryId: team.categoryId,
          createdById: adminUser.id,
          matchId: match.id,
        },
      });

      if (md.status !== MatchStatus.FINISHED) continue;

      for (const tp of teamPlayers) {
        const minutes = randInt(8, 32);
        const points = randInt(0, 18);
        await prisma.matchStatistic.create({
          data: {
            matchId: match.id,
            playerId: tp.id,
            points,
            rebounds: randInt(0, 10),
            assists: randInt(0, 7),
            steals: randInt(0, 4),
            blocks: randInt(0, 3),
            turnovers: randInt(0, 5),
            fouls: randInt(0, 5),
            minutesPlayed: minutes,
            fieldGoalsMade: Math.round(points * 0.35),
            fieldGoalsAtt: Math.round(points * 0.7),
            threePointsMade: randInt(0, 3),
            threePointsAtt: randInt(0, 6),
            freeThrowsMade: randInt(0, 4),
            freeThrowsAtt: randInt(0, 5),
          },
        });
      }
    }
  }
  console.log("Seed: partidos y estadisticas creados.");

  // -----------------------------------------------------------------------
  // 8. Torneo con fixture automatico (2 grupos, equipos propios + externos)
  // -----------------------------------------------------------------------
  const tournament = await prisma.tournament.create({
    data: {
      clubId: club.id,
      name: "Copa Choles Apertura 2026",
      startDate: addDays(today, 14),
      endDate: addDays(today, 45),
      status: TournamentStatus.PLANNED,
      description: "Torneo interclubes de apertura de temporada.",
    },
  });

  type Participant = { teamId: number | null; externalName: string | null; label: string };
  const participants: Participant[] = [
    ...teams.slice(0, 4).map((t) => ({ teamId: t.id, externalName: null, label: t.name })),
    { teamId: null, externalName: "Halcones BBC", label: "Halcones BBC" },
    { teamId: null, externalName: "Titanes del Norte", label: "Titanes del Norte" },
  ];
  const groupsOfParticipants = splitIntoGroups(participants, 2);

  for (let gi = 0; gi < groupsOfParticipants.length; gi++) {
    const group = await prisma.tournamentGroup.create({
      data: { tournamentId: tournament.id, name: `Grupo ${String.fromCharCode(65 + gi)}` },
    });
    const groupParticipants = groupsOfParticipants[gi];
    const tournamentTeams = [];
    for (const part of groupParticipants) {
      const tt = await prisma.tournamentTeam.create({
        data: {
          tournamentId: tournament.id,
          groupId: group.id,
          teamId: part.teamId,
          externalTeamName: part.externalName,
        },
      });
      tournamentTeams.push(tt);
    }

    const fixtures = generateRoundRobin(groupParticipants.length, false);
    for (const f of fixtures) {
      const home = tournamentTeams[f.homeIndex];
      const away = tournamentTeams[f.awayIndex];
      const homeTeamId = home.teamId;
      // Solo se crea el registro Match cuando el local es un equipo propio del club
      // (un partido contra un rival externo tambien se agenda usando nuestro equipo como "teamId")
      const ourTeamId = home.teamId ?? away.teamId;
      if (!ourTeamId) continue; // ambos externos: no aplica en este torneo demo
      const opponentLabel = home.teamId ? (away.externalTeamName ?? groupParticipants.find(p => p.teamId === away.teamId)?.label ?? "Rival") : (home.externalTeamName ?? "Rival");

      await prisma.match.create({
        data: {
          clubId: club.id,
          competition: "Copa Choles Apertura 2026",
          tournamentId: tournament.id,
          teamId: ourTeamId,
          opponentName: opponentLabel ?? "Rival",
          date: addDays(today, 14 + f.round * 7),
          time: "17:00",
          isHome: home.teamId === ourTeamId,
          status: MatchStatus.SCHEDULED,
        },
      });
    }
  }
  console.log("Seed: torneo con fixture automatico creado.");

  // -----------------------------------------------------------------------
  // 9. Pagos: conceptos + pagos con cartera realista
  // -----------------------------------------------------------------------
  const conceptMatricula = await prisma.paymentConcept.create({
    data: { clubId: club.id, name: "Matricula 2026", type: PaymentConceptType.MATRICULA, defaultAmount: 150000 },
  });
  const conceptMensualidad = await prisma.paymentConcept.create({
    data: { clubId: club.id, name: "Mensualidad", type: PaymentConceptType.MENSUALIDAD, defaultAmount: 120000 },
  });
  const conceptUniforme = await prisma.paymentConcept.create({
    data: { clubId: club.id, name: "Uniforme oficial", type: PaymentConceptType.UNIFORME, defaultAmount: 90000 },
  });

  let receiptCounter = 1;
  async function createPayment(playerId: number, conceptId: number, amount: number, status: PaymentStatus, dueDate: Date, paymentDate: Date | null, periodLabel?: string) {
    const receiptNumber = `REC-${String(receiptCounter).padStart(6, "0")}`;
    receiptCounter++;
    const payment = await prisma.payment.create({
      data: {
        clubId: club.id,
        playerId,
        conceptId,
        amount,
        dueDate,
        paymentDate: paymentDate ?? undefined,
        periodLabel,
        method: status === PaymentStatus.PAID ? pick(Object.values(PaymentMethod)) : null,
        status,
        registeredById: adminUser.id,
        receiptNumber,
      },
    });
    if (status === PaymentStatus.PAID) {
      await prisma.receipt.create({
        data: { paymentId: payment.id, number: receiptNumber },
      });
    }
    return payment;
  }

  for (const p of players) {
    // Matricula: pagada al inicio de temporada
    await createPayment(p.id, conceptMatricula.id, 150000, PaymentStatus.PAID, new Date("2026-01-31"), new Date("2026-01-20"));
    // Mensualidad julio: pagada
    await createPayment(p.id, conceptMensualidad.id, 120000, PaymentStatus.PAID, new Date("2026-07-05"), new Date("2026-07-03"), "2026-07");
    // Mensualidad agosto: distribucion realista para poblar cartera/alertas
    const roll = rand();
    if (roll < 0.55) {
      await createPayment(p.id, conceptMensualidad.id, 120000, PaymentStatus.PAID, new Date("2026-08-05"), addDays(new Date("2026-08-05"), randInt(-3, 2)), "2026-08");
    } else if (roll < 0.8) {
      await createPayment(p.id, conceptMensualidad.id, 120000, PaymentStatus.PENDING, addDays(today, randInt(1, 10)), null, "2026-08");
    } else {
      await createPayment(p.id, conceptMensualidad.id, 120000, PaymentStatus.PENDING, addDays(today, -randInt(1, 20)), null, "2026-08"); // vencida (OVERDUE se calcula en tiempo real)
    }
    // Uniforme: algunos pendientes
    if (rand() < 0.4) {
      await createPayment(p.id, conceptUniforme.id, 90000, PaymentStatus.PENDING, addDays(today, randInt(5, 30)), null);
    }
  }
  console.log("Seed: pagos y cartera creados.");

  // -----------------------------------------------------------------------
  // 10. Evaluaciones deportivas
  // -----------------------------------------------------------------------
  for (const p of players) {
    const player = await prisma.player.findUniqueOrThrow({ where: { id: p.id } });
    const evaluation = await prisma.evaluation.create({
      data: {
        clubId: club.id,
        playerId: p.id,
        date: addDays(today, -15),
        notes: "Evaluacion de control de mitad de temporada.",
      },
    });
    const heightM = (player.heightCm ?? 160) / 100;
    const imc = player.weightKg ? Math.round((player.weightKg / (heightM * heightM)) * 10) / 10 : null;

    const tests: Array<{ category: PhysicalTestCategory; testName: string; value: number; unit: string }> = [
      { category: PhysicalTestCategory.ANTHROPOMETRY, testName: "PESO", value: player.weightKg ?? 0, unit: "kg" },
      { category: PhysicalTestCategory.ANTHROPOMETRY, testName: "ALTURA", value: player.heightCm ?? 0, unit: "cm" },
      { category: PhysicalTestCategory.ANTHROPOMETRY, testName: "IMC", value: imc ?? 0, unit: "kg/m2" },
      { category: PhysicalTestCategory.ANTHROPOMETRY, testName: "ENVERGADURA", value: (player.heightCm ?? 160) + randInt(-3, 8), unit: "cm" },
      { category: PhysicalTestCategory.SPEED, testName: "10m", value: Math.round((randInt(180, 220) / 100) * 100) / 100, unit: "s" },
      { category: PhysicalTestCategory.SPEED, testName: "20m", value: Math.round((randInt(320, 390) / 100) * 100) / 100, unit: "s" },
      { category: PhysicalTestCategory.AGILITY, testName: "T-Test", value: Math.round((randInt(950, 1250) / 100) * 100) / 100, unit: "s" },
      { category: PhysicalTestCategory.JUMP, testName: "CMJ", value: randInt(22, 48), unit: "cm" },
      { category: PhysicalTestCategory.ENDURANCE, testName: "Yo-Yo", value: randInt(14, 21), unit: "nivel" },
    ];

    for (const t of tests) {
      await prisma.physicalTest.create({ data: { evaluationId: evaluation.id, ...t } });
      await prisma.performanceMetric.create({
        data: {
          clubId: club.id,
          playerId: p.id,
          metricKey: t.testName,
          date: evaluation.date,
          value: t.value,
        },
      });
    }
  }
  console.log("Seed: evaluaciones deportivas creadas.");

  // -----------------------------------------------------------------------
  // 11. Comunicaciones y notificaciones
  // -----------------------------------------------------------------------
  const guardianUsers = await prisma.user.findMany({ where: { clubId: club.id, role: "GUARDIAN" } });

  const welcomeMessage = await prisma.message.create({
    data: {
      clubId: club.id,
      title: "Bienvenida a la temporada 2026",
      body: "Estimadas familias, les damos la bienvenida a la temporada 2026 de Choles Team. Juntos, somos Choles Team.",
      audienceType: AudienceType.ALL,
      createdById: adminUser.id,
    },
  });
  const paymentReminder = await prisma.message.create({
    data: {
      clubId: club.id,
      title: "Recordatorio: mensualidad de agosto",
      body: "Les recordamos realizar el pago de la mensualidad de agosto antes de la fecha limite para evitar recargos por mora.",
      audienceType: AudienceType.GUARDIANS,
      createdById: adminUser.id,
    },
  });

  for (const gu of guardianUsers) {
    await prisma.messageRecipient.create({ data: { messageId: welcomeMessage.id, userId: gu.id } });
    await prisma.messageRecipient.create({ data: { messageId: paymentReminder.id, userId: gu.id } });
    await prisma.notification.create({
      data: {
        clubId: club.id,
        userId: gu.id,
        title: "Nuevo comunicado",
        body: welcomeMessage.title,
        type: "MESSAGE",
        relatedUrl: "/comunicaciones",
      },
    });
  }

  // -----------------------------------------------------------------------
  // 12. Configuracion basica del club
  // -----------------------------------------------------------------------
  await prisma.setting.upsert({
    where: { clubId_key: { clubId: club.id, key: "currency" } },
    update: {},
    create: { clubId: club.id, key: "currency", value: "COP" },
  });
  await prisma.setting.upsert({
    where: { clubId_key: { clubId: club.id, key: "timezone" } },
    update: {},
    create: { clubId: club.id, key: "timezone", value: "America/Bogota" },
  });
  await prisma.setting.upsert({
    where: { clubId_key: { clubId: club.id, key: "whatsapp_integration_enabled" } },
    update: {},
    create: { clubId: club.id, key: "whatsapp_integration_enabled", value: "false" },
  });

  console.log("\nSeed completado.");
  console.log("--------------------------------------------------");
  console.log("Credenciales demo (SOLO DESARROLLO):");
  console.log(`  Super admin:  superadmin@cholessports.com / ${superAdminPassword}`);
  console.log(`  Administrador: admin@cholesteam.com / ${adminPassword}`);
  console.log(`  Entrenador:   coach1@cholesteam.com / ${coachPassword}`);
  console.log(`  Delegado:     delegado1@cholesteam.com / Delegado123!`);
  console.log(`  Padre demo:   familia.demo@example.com / ${guardianPassword}`);
  console.log("  (todos deben cambiar la contrasena en el primer login)");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
