<script setup lang="ts">
import { onMounted, ref } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";

import * as APICases from "../../../../api/cases";

// Images
import Ton from "@/assets/images/cases-pg/ton.svg";
import Empty from "../../../../components/common/Empty/Empty.vue";

const emit = defineEmits<{ (e: "open-case", payload: any): void }>();
const props = defineProps<{ ActiveTab: string }>();

const useCache = useCacheStore() as any;
const bucketsLink = import.meta.env.VITE_APP_S3_LINK;

const skeleton = ref(true);
const cases = ref<any[]>(
  Array.from({ length: 10 }, () => ({
    Image: `${bucketsLink}/cases/covers/Pink_Case.png`,
    Name: "Pink Case",
    price_nano: 1_000_000_000,
    BGStart: "#B0137E",
    BGCenter: "#70104F",
    BGEnd: "#2B072C",
    Symbol: `${bucketsLink}/symbols/Teleplane.png`,
  }))
);

function preloadImages(urls: (string | null | undefined)[], timeout = 15000) {
  if (!urls) { return; }
  const list = (urls || []).filter(Boolean) as string[];
  if (!list.length) return Promise.resolve();

  return Promise.all(
    list.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const done = () => resolve();
          const tid = setTimeout(done, timeout);

          img.onload = () => {
            clearTimeout(tid);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(tid);
            resolve();
          };
          img.src = src;
        })
    )
  );
}

function openCase(payload: any) {
  emit("open-case", payload);
}

async function getCases() {
  skeleton.value = true;

  let list: any[] | null = useCache.CasesData?.length ? useCache.CasesData : null;

  if (!list) {
    const res = await APICases.cases().catch(() => null);
    list = res?.cases ?? null;
    if (!list) return;
    useCache.CasesData = list;
  }

  await preloadImages(list.map((i) => i.Image));

  cases.value = list;
  skeleton.value = false;
}

onMounted(getCases);
</script>

<template>
    <div class="cases-block">
        <div v-if="props.ActiveTab === 'nfts'" class="items" :class="{ skeleton: skeleton }">
            <div 
                v-for="(item, index) in cases" 
                :key="index"
                class="item" 
                @click="openCase(item)"
                :style="{ 
                    '--case-start-color': `${item.BGCenter}`,
                    '--case-center-color': `${item.BGCenter}`,
                    '--case-end-color': `${item.BGEnd}`
                }"
            >
                <div class="sk-load" v-if="skeleton"></div>
                <div class="image">
                    <img :src="getImgSvg(item.Image)" alt="image" />
                </div>
                <div class="context">
                    <div class="title">
                        <h4>{{ item.Name }}</h4>
                    </div>
                    <div class="button">
                        <button>
                            <p>{{ cutNumberNano(item.price_nano) }}</p>
                            <img :src="Ton" alt="ton">
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <Empty
            v-if="props.ActiveTab === 'memgifts'"
            :Title="'Empty cases'"
            :Description="'No cases yet'"
        />
    </div>
</template>

<style lang="scss" src="./Cases.scss" scoped></style>