import { defineStore } from 'pinia';

export const useCacheStore = defineStore('cache', {
  state: () => ({
    UserData: {
      Rank: 0,
    },

    LiveWinsData: null,
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