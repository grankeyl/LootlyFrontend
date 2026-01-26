import { defineStore } from 'pinia';

export const useCacheStore = defineStore('cache', {
  state: () => ({
    UserData: { Rank: 0 },
    UserDataMeta: {},

    LiveWinsData: null,
    CasesData: {},
    CasesTasksData: {},
    CasesRewardsData: {},

    TasksData: {},

    Market: {
      Basket: {
        Items: [],
        Count: 0,
        FullyLoaded: false,
      },
    },

    FortuneTap: {
      Items: [],
      Count: 0,
      FullyLoaded: false,
    }
  }),
});