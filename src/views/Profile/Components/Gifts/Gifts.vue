<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, computed } from "vue";
import { cutNumberNano } from "../../../../utils/useTon";
import { Icon } from "../../../../components/Icon";
import { getImgSvg } from "../../../../utils/useApp";

import * as APICases from "../../../../api/cases";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";

// Images
import EmptyImage from "@/assets/images/profile-pg/empty.svg";
import LogotypeImage from "@/assets/images/logotype.svg";
import { useRouter } from "vue-router";
import TelegramModule from "../../../../hooks/useTelegram";

type Gift = any;

const emit = defineEmits<{
  (e: "open-modal", payload: Gift): void;
  (e: "inventory-set", value: any[]): void;
  (e: "inventory-count", value: number): void;
}>();

const props = defineProps<{
  scrollEl?: any;          // не используем, но оставляем для совместимости
  inventory?: any[];       // начальные данные (скелетоны)
  inventoryCount?: number; // начальные данные
  status?: string;         // фильтр
  pageSize?: number;       // лимит
}>();

const router = useRouter();

/* ================== STATE ================== */
const status = computed(() => props.status ?? "all");
const limit  = computed(() => Math.max(1, props.pageSize ?? 20));

const items   = ref<any[]>(props.inventory ?? Array.from({ length: 9 }, () => ({ skeleton: true })));
const total   = ref<number | null>(props.inventoryCount ?? null);
const offset  = ref(0);
const hasMore = ref(true);
const loading = ref(false);
const skeleton = ref(true);

const itemsEl   = ref<HTMLElement | null>(null);
const sentinel  = ref<HTMLDivElement | null>(null);

let io: IntersectionObserver | null = null;
let reqId = 0;

/* ================== DATA LOAD ================== */
async function load(initial = false) {
  if (loading.value) return;
  if (!hasMore.value && !initial) return;

  const my = ++reqId;
  loading.value = true;

  if (initial) {
    offset.value  = 0;
    hasMore.value = true;
    total.value   = null;
    skeleton.value = true;
    // оставляем текущие items как скелетоны
    emit("inventory-set", items.value);
    emit("inventory-count", 0);
  }

  let res: any = null;
  try {
    res = await APICases.inventory(status.value, limit.value, offset.value);
  } catch (e) {
    if (my !== reqId) return;
    loading.value = false;
    skeleton.value = false;
    hasMore.value = false;
    return;
  }

  if (my !== reqId) return;

  const batch: any[] = res?.items ?? [];
  const totalFromApi = (res?.total_all ?? res?.total ?? null) as number | null;

  // вообще ничего нет
  if ((batch.length === 0 && offset.value === 0) || totalFromApi === 0) {
    items.value = [];
    total.value = 0;
    hasMore.value = false;
    skeleton.value = false;
    loading.value = false;
    emit("inventory-set", items.value);
    emit("inventory-count", 0);
    return;
  }

  // закончились элементы
  if (batch.length === 0) {
    hasMore.value = false;
    loading.value = false;
    skeleton.value = false;
    return;
  }

  const mapped = batch.map((i) => ({ ...i, skeleton: false }));

  if (initial || offset.value === 0 || items.value[0]?.skeleton) {
    items.value = mapped;
  } else {
    items.value.push(...mapped);
  }

  emit("inventory-set", items.value);

  offset.value += batch.length;

  if (totalFromApi != null) {
    total.value = totalFromApi;
    hasMore.value = items.value.length < totalFromApi;
    emit("inventory-count", totalFromApi);
  } else {
    hasMore.value = batch.length === limit.value;
  }

  skeleton.value = false;
  loading.value = false;
}

/* ================== INTERSECTION OBSERVER ================== */
function teardownIO() {
  if (io && sentinel.value) io.unobserve(sentinel.value);
  io?.disconnect();
  io = null;
}

function setupIO() {
  teardownIO();
  if (!sentinel.value) return;

  // root: null => всегда относительно окна, без scrollEl, без поиска скроллера
  io = new IntersectionObserver(
    async (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (loading.value || !hasMore.value) continue;
        await load(false);
        // после подгрузки sentinel уйдёт ниже экрана, следующая подгрузка будет только
        // когда пользователь снова доскроллит до самого низа
      }
    },
    {
      root: null,
      rootMargin: "0px 0px 0px 0px", // строго когда sentinel реально попал в окно
      threshold: 0,
    }
  );

  io.observe(sentinel.value);
}

/* ================== NAVIGATION ================== */
function openCases() {
  router.push("/");
}

function openItem(g: Gift) {
  if (!g) return;
  if (g.status === "sold") return;
  if (g.status === "received") return;
  if (g.status === "reserve") return;
  TelegramModule.useLightHaptic();
  emit("open-modal", g);
}

/* ================== LIFECYCLE ================== */
onMounted(async () => {
  await nextTick();
  // itemsEl.value есть, но сейчас он нам не нужен
  await load(true);       // ОДИН стартовый запрос
  await nextTick();
  setupIO();              // инициализируем наблюдение за sentinel
});

onBeforeUnmount(() => {
  teardownIO();
});

// смена фильтра / лимита — полный ресет
watch(
  () => [status.value, limit.value],
  () => {
    load(true);
  }
);
</script>

<template>
  <div class="gifts" :class="{ skeleton: skeleton }">
    <div v-if="!items || !items.length" class="empty">
      <div class="image">
        <img :src="EmptyImage" alt="empty-gifts" />
      </div>
      <div class="context">
        <div class="title">
          <h4>{{ $t('profile.gifts.noGifts') }}</h4>
        </div>
        <div class="descr">
          <h4>
            {{ $t('profile.gifts.noGiftsGoTo') }}
            <span class="cases" @click="openCases">
              <img :src="LogotypeImage" alt="logotype" />
              <p>{{ $t('profile.gifts.cases') }}</p>
            </span>
            {{ $t('profile.gifts.andWinSome') }}
          </h4>
        </div>
      </div>
    </div>
    <div v-if="items && items.length" class="profileItems blocks" ref="itemsEl">
      <div v-if="skeleton" class="profileItem" v-for="(_, index) in items" :key="index">
        <div class="sk-load"></div>
      </div>
      <div 
        v-if="!skeleton" 
        class="profileItem" 
        v-for="(item, index) in items" 
        v-show="!item.skeleton && item.status !== 'sold'"
        :key="index" 
        @click="openItem(item)"
      >
        <div
          class="background upg"
          :style="{
            '--start-color': item.bg_start,
            '--center-color': item.bg_center,
            '--end-color': item.bg_end,
          }"
        ></div>
        <div class="model"> 
          <div class="upg">
            <div class="image">
              <img :src="getImgSvg(item.reward_image)" alt="model" />
            </div>
          </div>
        </div>
        <div class="button" :class="item.status">
          <button v-if="item.status && item.status === 'sold'">
            <h5>{{ $t('profile.gifts.statusSold') }}</h5>
            <div class="kit-icon" v-html="Icon.Done"></div>
          </button>
          <button v-if="item.status && (item.status === 'held' || item.status === 'purchased')">
            <h5>{{ cutNumberNano(item.price_nano) }}</h5>
            <img :src="TonWhiteIcon" alt="ton-icon" />
          </button>
          <button v-if="item.status && item.status === 'used'">
            <h5>{{ $t('profile.gifts.statusUsed') }}</h5>
          </button>
          <button v-if="item.status && item.status === 'received'">
            <h5>{{ $t('profile.gifts.statusUsed') }}</h5>
            <div class="kit-icon" v-html="Icon.Done"></div>
          </button>
          <button v-if="item.status && item.status === 'reserve'">
            <h5>{{ $t('profile.gifts.statusReserve') }}</h5>
            <div class="spinner"></div>
          </button>
        </div>
      </div>

      <div v-if="!skeleton && loading" class="loading-more">
        <div class="sk-load"></div>
      </div>

      <div ref="sentinel" class="sentinel"></div>
    </div>
  </div>
</template>

<style lang="scss" src="./Gifts.scss" scoped></style>
<style>
.sentinel { height: 1px; width: 100%; }
</style>