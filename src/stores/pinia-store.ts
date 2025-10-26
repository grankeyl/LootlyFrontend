import { defineStore } from 'pinia';

export const useCacheStore = defineStore('cache', {
  state: () => ({
    UserData: {
      Rank: 0,
    },
    CasesData: {},
    CasesRewardsData: {},

    Market: {
      Basket: {
        Items: [],
        Count: 0,
        FullyLoaded: false,
      },
    }
  }),
});