/**
 * Pseudocode:
 * 1) List app routes and their components.
 * 2) Plug into your router (React Router, Next.js, etc.).
 */

import { PlayPage } from "./pages/Play";
import { DashboardPage } from "./pages/Dashboard";
import { DashboardStagesPage } from "./pages/DashboardStages";
import { DashboardFairnessPage } from "./pages/DashboardFairness";
import { DashboardComparePage } from "./pages/DashboardCompare";
import { BalancerPage } from "./pages/Balancer";
import { ExportPage } from "./pages/Export";

export const routes = [
  { path: "/play", component: PlayPage },
  { path: "/dashboard", component: DashboardPage },
  { path: "/dashboard/stages", component: DashboardStagesPage },
  { path: "/dashboard/fairness", component: DashboardFairnessPage },
  { path: "/dashboard/compare", component: DashboardComparePage },
  { path: "/balancer", component: BalancerPage },
  { path: "/export", component: ExportPage },
];

// TODO: Connect routes to the app router.
