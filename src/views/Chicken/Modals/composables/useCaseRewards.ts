import type { Ref } from "vue";
import { preloadImages } from "./preloadImages";

type UseCaseRewardsArgs = {
  getCaseId: () => string | undefined;
  useCache: any;
  itemRewards: Ref<any[]>;
  skeletonRewards: Ref<boolean>;
};

export function useCaseRewards(args: UseCaseRewardsArgs) {
  const { getCaseId, useCache, itemRewards, skeletonRewards } = args;

  async function getRewards() {
    const id = getCaseId();
    if (!id) return;

    const cached = useCache.CasesRewardsData?.[id];
    let items: any[] | null = null as any;

    if (cached) {
      items = cached;
    } else {
      // IMPORTANT: APICases.rewards здесь НЕ импортим, чтоб composable был “чистым”.
      // FreeCase.vue передаст items в кеш через api? — поэтому сделаем так:
      // ожидаем, что useCache имеет метод/поле fetchRewards? Нет.
      // Значит проще: импортируем APICases прямо тут (локально).
      // (Это нормально для composable.)
      const APICases = await import("../../../../api/cases");
      const res = await (APICases as any).rewards(id).catch(() => null);

      items = (res?.items ?? res?.data?.items ?? res?.rewards ?? null) as any[] | null;
      if (!items) return;

      useCache.CasesRewardsData = useCache.CasesRewardsData || {};
      useCache.CasesRewardsData[id] = items;
    }

    if (items) {
      await preloadImages(items.map((i: any) => i?.image));
      itemRewards.value = items;
    }

    skeletonRewards.value = false;
  }

  return { getRewards };
}