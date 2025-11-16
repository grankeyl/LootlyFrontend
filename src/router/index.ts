import { createRouter, createWebHistory } from "vue-router";

import CasesView from "../views/Cases/Cases.vue";
import OnboardView from "../views/Onboard/Onboard.vue";
import MarketView from "../views/Market/Market.vue";
import EarnView from "../views/Earn/Earn.vue";
import ProfileView from "../views/Profile/Profile.vue";
import BalanceView from "../views/Balance/Balance.vue";
import LeaderboardView from "../views/Leaderboard/Leaderboard.vue";
import CrashView from "../views/Crash/Crash.vue";
import Crash1View from "../views/Crash1/Crash.vue";

const routes = [
  { path: "/", component: CasesView },
  { path: "/onboard", component: OnboardView },
  { path: "/market", component: MarketView },
  { path: "/market/item/:id", component: MarketView },
  { path: "/earn", component: EarnView },
  { path: "/profile", component: ProfileView },
  { path: "/profile/item/:id", component: ProfileView },
  { path: "/balance", component: BalanceView },
  { path: "/leaderboard", component: LeaderboardView },
  { path: "/crash", component: CrashView },
  { path: "/crash1", component: Crash1View },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});