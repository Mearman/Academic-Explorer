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
    // Get all visits and sort them manually since visitedAt is part of compound key
    const visits = await this.visits.toArray();
    const sortedVisits = visits.sort((a, b) => b.visitedAt - a.visitedAt);

    const routeIds = [...new Set(sortedVisits.map((v) => v.routeId))];
    const routes = await this.routes
      .where("normalizedRoute")
      .anyOf(routeIds)
      .toArray();
    const routeMap = new Map(
      routes.map((r) => [r.normalizedRoute, r.normalizedRoute]),
    );

    return sortedVisits.map((visit) => {
      const route = routeMap.get(visit.routeId);
      if (!route) throw new Error(`Route not found for ${visit.routeId}`);
      return {
        route,
        visitedAt: visit.visitedAt,
      };
    });
  }

  async deleteVisit(routeId: string, visitedAt: number) {
    // Delete the specific visit entry
    await this.visits.where("[routeId+visitedAt]").equals([routeId, visitedAt]).delete();

    // Check if there are any remaining visits for this route
    const remainingVisits = await this.visits.where("routeId").equals(routeId).count();

    // If no more visits for this route, clean up the route entry
    if (remainingVisits === 0) {
      await this.routes.where("normalizedRoute").equals(routeId).delete();
    }
  }

  async clear() {
    await this.visits.clear();
    await this.routes.clear();
  }
}

export const historyDB = new HistoryDatabase();
