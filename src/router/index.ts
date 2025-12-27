import { createRouter, createWebHistory } from "vue-router";

import CasesView from "../views/Cases/Cases.vue";
import OnboardView from "../views/Onboard/Onboard.vue";
import MarketView from "../views/Market/Market.vue";
import EarnView from "../views/Earn/Earn.vue";
import ProfileView from "../views/Profile/Profile.vue";
import BalanceView from "../views/Balance/Balance.vue";
import BalanceOnboardView from "../views/Balance/Onboard/Onboard.vue";
import LeaderboardView from "../views/Leaderboard/Leaderboard.vue";
import CrashView from "../views/Crash/Crash.vue";
import ChickenView from "../views/Chicken/Chicken.vue";

const routes = [
  { path: "/", component: CasesView },
  { path: "/onboard", component: OnboardView },
  { path: "/market", component: MarketView },
  { path: "/market/item/:id", component: MarketView },
  { path: "/earn", component: EarnView },
  { path: "/profile", component: ProfileView },
  { path: "/profile/item/:id", component: ProfileView },
  { path: "/balance", component: BalanceView },
  { path: "/balance/onboard", component: BalanceOnboardView },
  { path: "/leaderboard", component: LeaderboardView },
  { path: "/crash", component: CrashView },
  { path: "/chicken", component: ChickenView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});