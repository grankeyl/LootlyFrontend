import { createRouter, createWebHistory } from "vue-router";

import CasesView from "../views/Cases/Cases.vue";
import MarketView from "../views/Market/Market.vue";
import EarnView from "../views/Earn/Earn.vue";
import ProfileView from "../views/Profile/Profile.vue";
import BalanceView from "../views/Balance/Balance.vue";
import LeaderboardView from "../views/Leaderboard/Leaderboard.vue";
import CrashView from "../views/Crash/Crash.vue";

const routes = [
  { path: "/", component: CasesView },
  { path: "/market", component: MarketView },
  { path: "/market/item/:id", component: MarketView },
  { path: "/earn", component: EarnView },
  { path: "/profile", component: ProfileView },
  { path: "/profile/item/:id", component: ProfileView },
  { path: "/balance", component: BalanceView },
  { path: "/leaderboard", component: LeaderboardView },
  { path: "/crash", component: CrashView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});