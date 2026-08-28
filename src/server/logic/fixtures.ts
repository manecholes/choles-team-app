/**
 * Generacion de fixtures (punto 11 - Torneos).
 *
 * Modulo puro (sin dependencias de Prisma/Next) para poder testearlo de
 * forma aislada y reutilizarlo tanto desde el servicio de torneos como
 * desde el seed de datos demo.
 */

export interface FixturePairing {
  round: number;
  homeIndex: number; // indice dentro del arreglo de participantes (equipo o "bye")
  awayIndex: number;
}

const BYE = -1;

/**
 * Round robin (todos contra todos) usando el metodo del circulo.
 * Si `teamCount` es impar se agrega un "bye" (indice -1) que el llamador
 * debe filtrar; cada equipo descansa exactamente una vez por vuelta.
 *
 * doubleRound=true genera ida y vuelta (invirtiendo local/visitante en la
 * segunda vuelta).
 */
export function generateRoundRobin(
  teamCount: number,
  doubleRound = false
): FixturePairing[] {
  if (teamCount < 2) return [];

  const indices = Array.from({ length: teamCount }, (_, i) => i);
  const hasBye = teamCount % 2 !== 0;
  if (hasBye) indices.push(BYE);

  const n = indices.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: FixturePairing[] = [];

  const arr = [...indices];
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home === BYE || away === BYE) continue;
      // Alterna local/visitante para repartir partidos en casa de forma mas pareja
      const isEven = round % 2 === 0;
      fixtures.push({
        round: round + 1,
        homeIndex: isEven ? home : away,
        awayIndex: isEven ? away : home,
      });
    }
    // rotacion: se fija el primer elemento y se rota el resto
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as number);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  if (!doubleRound) return fixtures;

  const secondLeg = fixtures.map((f) => ({
    round: f.round + rounds,
    homeIndex: f.awayIndex,
    awayIndex: f.homeIndex,
  }));

  return [...fixtures, ...secondLeg];
}

/**
 * Distribuye N participantes en `groupCount` grupos usando reparto tipo
 * "serpiente" (snake draft) para que los grupos queden balanceados en
 * tamano (diferencia maxima de 1 participante entre grupos).
 */
export function splitIntoGroups<T>(participants: T[], groupCount: number): T[][] {
  if (groupCount < 1) throw new Error("groupCount debe ser >= 1");
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  let dir = 1;
  let g = 0;
  for (const p of participants) {
    groups[g].push(p);
    if (dir === 1 && g === groupCount - 1) {
      dir = -1;
    } else if (dir === -1 && g === 0) {
      dir = 1;
    } else {
      g += dir;
    }
  }
  return groups;
}

export interface StandingsInput {
  teamKey: string; // id estable del participante (string para admitir equipos externos)
  isHome: boolean;
  scoreFor: number;
  scoreAgainst: number;
}

export interface StandingsRow {
  teamKey: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
}

/**
 * Calcula la tabla de posiciones a partir de resultados finalizados.
 * Orden: mas victorias primero, luego mejor diferencia de puntos, luego
 * mas puntos anotados.
 */
export function computeStandings(results: StandingsInput[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>();

  function ensure(key: string): StandingsRow {
    let row = table.get(key);
    if (!row) {
      row = { teamKey: key, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointsDiff: 0 };
      table.set(key, row);
    }
    return row;
  }

  for (const r of results) {
    const row = ensure(r.teamKey);
    row.played += 1;
    row.pointsFor += r.scoreFor;
    row.pointsAgainst += r.scoreAgainst;
    row.pointsDiff = row.pointsFor - row.pointsAgainst;
    if (r.scoreFor > r.scoreAgainst) row.wins += 1;
    else row.losses += 1;
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    return b.pointsFor - a.pointsFor;
  });
}
