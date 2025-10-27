import Dexie, { Table } from "dexie";
import { normalizeRoute } from "@academic-explorer/utils/normalize-route";

export interface RouteEntry {
  normalizedRoute: string; // primary key
}

export interface VisitEntry {
  routeId: string; // part of compound primary key
  visitedAt: number; // part of compound primary key
}

export class HistoryDatabase extends Dexie {
  routes!: Table<RouteEntry, string>;
  visits!: Table<VisitEntry, [string, number]>;

  constructor() {
    super("HistoryDatabase");
    this.version(1).stores({
      routes: "&normalizedRoute",
      visits: "&[routeId+visitedAt]",
    });
  }

  async addVisit({
    path,
    search,
    hash,
  }: {
    path: string;
    search: string;
    hash: string;
  }) {
    const normalized = normalizeRoute({ path, search }) + hash;
    const visitedAt = Date.now();

    // Ensure route exists
    await this.routes.put({ normalizedRoute: normalized });

    // Add visit
    await this.visits.put({ routeId: normalized, visitedAt });
  }

  async getAll() {
    // Join routes and visits, ordered by visitedAt desc
    const visits = await this.visits.orderBy("visitedAt").reverse().toArray();
    const routeIds = [...new Set(visits.map((v) => v.routeId))];
    const routes = await this.routes
      .where("normalizedRoute")
      .anyOf(routeIds)
      .toArray();
    const routeMap = new Map(
      routes.map((r) => [r.normalizedRoute, r.normalizedRoute]),
    );

    return visits.map((visit) => {
      const route = routeMap.get(visit.routeId);
      if (!route) throw new Error(`Route not found for ${visit.routeId}`);
      return {
        route,
        visitedAt: visit.visitedAt,
      };
    });
  }

  async clear() {
    await this.visits.clear();
    await this.routes.clear();
  }
}

export const historyDB = new HistoryDatabase();
