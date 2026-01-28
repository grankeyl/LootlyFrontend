<script setup lang="ts">
import { computed, onMounted, ref, useAttrs, watch, nextTick, onBeforeUnmount } from "vue";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";
import { cutNumberNano } from "../../../../utils/useTon";
import { useModal } from "../../../../components/common/Modal";
import { showErrorToast } from "../../../../utils/toastManager";
import { useTranslation } from "i18next-vue";

import * as APIFortuneTap from "../../../../api/fortunetap";

import WinModal from "./Win.vue";

// Images
import BombIcon from "@/assets/images/fortune-tap-pg/bomb.png";

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import MinusIcon from "@/assets/icons/minus.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import CloseIcon from "@/assets/icons/close.svg";

import FortuneWheel, { type WheelItem } from "./../../../../components/common/Fortune/FortuneWheel.vue";
import SlotMachine from "./../../../../components/common/Slot/SlotMachine.vue";
import Ratio from "./Ratio.vue";

const { t } = useTranslation();

const attrs = useAttrs();
const emit = defineEmits<{ (e: "close"): void }>();

const props = defineProps<{
  data: any;
  __modal?: { close: (payload?: any) => void };
}>();

const useCache = useCacheStore() as any;
const wheelRef = ref<InstanceType<typeof FortuneWheel> | null>(null);
const slotRef = ref<InstanceType<typeof SlotMachine> | null>(null);

const demoEnabled = ref(false);

function asNum(v: any, fallback = 0) {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
function clampInt(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, Math.floor(n)));
}

// ===== bounds =====
const DEFAULT_MIN_CHANCE = 0.001;
const DEFAULT_MAX_CHANCE = 50;

function sanitizeChanceBound(v: number, fallback: number) {
  if (!Number.isFinite(v) || v <= 0) return fallback;
  if (v > 1000) return fallback; // защита от nano
  return v;
}

const minChance = computed<number>(() => {
  const raw = asNum(props.data?.min_chance, DEFAULT_MIN_CHANCE);
  return sanitizeChanceBound(raw, DEFAULT_MIN_CHANCE);
});
const maxChance = computed<number>(() => {
  const raw = asNum(props.data?.max_chance, DEFAULT_MAX_CHANCE);
  return sanitizeChanceBound(raw, DEFAULT_MAX_CHANCE);
});

const percent = ref<number>(25);

watch(
  [minChance, maxChance],
  () => {
    const mn = minChance.value;
    const mx = maxChance.value >= mn ? maxChance.value : DEFAULT_MAX_CHANCE;
    percent.value = clamp(percent.value, mn, mx);
  },
  { immediate: true },
);

const chance = computed(() => clamp(percent.value, minChance.value, maxChance.value));

// ===== spinsCount =====
const SPINS_MIN = 1;
const SPINS_MAX = 3;
const spinsCount = ref<number>(SPINS_MIN);

function setSpinsCount(v: number) {
  spinsCount.value = clampInt(v, SPINS_MIN, SPINS_MAX);
}
function incSpins() {
  setSpinsCount(spinsCount.value + 1);
}
function decSpins() {
  setSpinsCount(spinsCount.value - 1);
}

watch(spinsCount, (v) => {
  const nv = clampInt(v, SPINS_MIN, SPINS_MAX);
  if (nv !== v) spinsCount.value = nv;
});

function pluralRu(n: number): "one" | "few" | "many" {
  const a = Math.abs(Math.trunc(n));
  const mod100 = a % 100;
  const mod10 = a % 10;
  if (mod100 >= 11 && mod100 <= 14) return "many";
  if (mod10 === 1) return "one";
  if (mod10 >= 2 && mod10 <= 4) return "few";
  return "many";
}

const spinsKey = computed(() => {
  const form = pluralRu(spinsCount.value);
  return `fortuneTap.modals.gift.spins_${form}`;
});

// ===== Reward loading =====
type RewardGift = {
  id: string;
  name: string;
  image?: string;
  price_nano?: string | number;
  inventory_item_id?: any;
  [k: string]: any;
};

const wheelGiftLoading = ref(true);
const wheelGift = ref<RewardGift | null>(null);

function giftIconUrl(g: RewardGift | null): string | null {
  if (!g?.image) return null;
  const img = String(g.image);
  if (/^https?:\/\//i.test(img)) return img;
  return getImgSvg(img.startsWith("/") ? img : `/${img}`);
}

const winIcon = computed(() => giftIconUrl(wheelGift.value));

const slotItems = computed(() => [
  { id: "bomb", icon: BombIcon, label: "Bomb" },
  { id: "gift", icon: winIcon.value ?? "", label: "Gift" },
]);

const slotsItemsResults = ref<Array<string | number>>(["bomb", "bomb", "bomb"]);

// ===== wheel win layout =====
function winCountFromChance(v: number) {
  if (v <= 5) return 1;
  if (v <= 20) return 2;
  if (v <= 35) return 3;
  return 4;
}

const LAYOUTS: Record<number, number[]> = {
  1: [3],
  2: [1, 6],
  3: [1, 4, 7],
  4: [0, 2, 5, 7],
};

const winCountStable = ref<number>(winCountFromChance(chance.value));
watch(chance, (v) => {
  const next = winCountFromChance(v);
  if (next !== winCountStable.value) winCountStable.value = next;
});

const wheelItems = computed<WheelItem[]>(() => {
  const wins = winCountStable.value;
  const winIdx = LAYOUTS[wins] ?? LAYOUTS[1];
  const winSet = new Set(winIdx);

  const items: WheelItem[] = [];
  for (let i = 0; i < 8; i++) {
    const isWin = winSet.has(i);

    if (isWin) {
      const loading = wheelGiftLoading.value || !winIcon.value;
      items.push({
        id: i + 1,
        type: "win",
        icon: loading ? "" : (winIcon.value as string),
        // @ts-ignore
        loading,
        fill: "rgba(144,30,107,0.39)",
        stroke: "#611A52",
        strokeWidth: 1.0,
        opacity: 1,
      } as any);
    } else {
      items.push({
        id: i + 1,
        type: "lose",
        icon: BombIcon,
        // @ts-ignore
        loading: false,
        fill: "rgba(255,255,255,0.08)",
        stroke: "#611A52",
        strokeWidth: 0.9,
        opacity: 1,
      } as any);
    }
  }
  return items;
});

function pickRandom(arr: number[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getIndexesByType(type: "win" | "lose") {
  const out: number[] = [];
  const items = wheelItems.value;
  for (let i = 0; i < items.length; i++) {
    if ((items[i].type ?? "lose") === type && !items[i].disabled) out.push(i);
  }
  return out;
}

// ===== Demo + locks =====
const spinning = ref(false);

async function spinDemo() {
  const w = getIndexesByType("win");
  const l = getIndexesByType("lose");
  if (!w.length || !l.length) return;

  const prob = clamp(chance.value, 0, 100) / 100;
  const isWin = Math.random() < prob;

  const target = isWin ? pickRandom(w) : pickRandom(l);

  spinning.value = true;
  try {
    await wheelRef.value?.spinTo(target);
  } finally {
    spinning.value = false;
  }
}

function demoSlotResults(n: number) {
  const prob = clamp(percent.value, 0, 100) / 100;

  const results: Array<string | number> = [];
  for (let i = 0; i < n; i++) results.push(Math.random() < prob ? "gift" : "bomb");
  return results;
}

async function spinDemoSlot() {
  if (spinning.value) return;

  const n = clampInt(spinsCount.value, SPINS_MIN, SPINS_MAX);
  if (n <= 1) return spinDemo();

  spinning.value = true;
  try {
    slotsItemsResults.value = demoSlotResults(n);
    await nextTick();
    await (slotRef.value as any)?.spin?.();
    // spinning выключаем в onSlotEnd
  } catch {
    spinning.value = false;
  }
}

function toNanoBig(v: any): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.trunc(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return BigInt(Math.trunc(n));
  }
  return 0n;
}

function subBalanceNano(costNano: any) {
  const cost = toNanoBig(costNano);
  if (cost <= 0n) return;

  const cur = useCache.UserData.BalanceNano;
  if (typeof cur === "bigint") {
    useCache.UserData.BalanceNano = cur - cost;
  } else {
    // если у тебя вдруг number
    useCache.UserData.BalanceNano = Number(cur ?? 0) - Number(cost);
  }
}

function applyPlaySideEffects(res: any) {
  if (res?.success) {
    subBalanceNano(res.data?.cost_nano ?? 0);
    if (wheelGift.value) wheelGift.value.inventory_item_id = res.data?.inventory_item_id;
  }
}

async function spinNormal() {
  if (spinning.value) return;
  if (!wheelGift.value?.id) return;

  spinning.value = true;

  const pct = clamp(percent.value, minChance.value, maxChance.value);
  const res = await APIFortuneTap.play(wheelGift.value.id, pct).catch(() => null);

  if (!res) {
    spinning.value = false;
    return;
  }

  applyPlaySideEffects(res);

  const won = !!res.data?.won;
  const winIdx = getIndexesByType("win");
  const loseIdx = getIndexesByType("lose");
  const target = won ? (winIdx.length ? pickRandom(winIdx) : 0) : (loseIdx.length ? pickRandom(loseIdx) : 0);

  await wheelRef.value?.spinTo(target);
  spinning.value = false;
}

async function spinSlot() {
  if (spinning.value) return;
  if (!wheelGift.value?.id) return;

  const n = clampInt(spinsCount.value, SPINS_MIN, SPINS_MAX);
  if (n <= 1) return spinNormal();

  spinning.value = true;

  try {
    const pct = clamp(percent.value, minChance.value, maxChance.value);

    const results: Array<string | number> = [];
    for (let i = 0; i < n; i++) {
      const res = await APIFortuneTap.play(wheelGift.value.id, pct).catch(() => null);

      if (!res) {
        showErrorToast(t("extra.notEnoughTon"));
        while (results.length < n) results.push("bomb");
        break;
      }

      applyPlaySideEffects(res);

      results.push(res.data?.won ? "gift" : "bomb");
    }

    while (results.length < n) results.push("bomb");
    slotsItemsResults.value = results.slice(0, n);

    await nextTick();
    await (slotRef.value as any)?.spin?.();
    // spinning выключим в onSlotEnd
  } catch {
    spinning.value = false;
  }
}

async function onSlotEnd(payload: any) {
  const results = (payload?.results ?? slotsItemsResults.value) as Array<string | number>;
  const anyWin = Array.isArray(results) && results.includes("gift");

  if (anyWin) {
    openWinModal({ ...wheelGift.value, type: "win", multi: true, multiItems: results });
  } else {
    openWinModal({ id: "bomb", image: BombIcon, name: "Bomb", type: "lose", multi: true, multiItems: results });
  }

  spinning.value = false;
}

function toBigNano(v: any): bigint {
  if (typeof v === "bigint") return v;
  const n = Number(v ?? 0);
  return BigInt(Math.trunc(Number.isFinite(n) ? n : 0));
}

async function onSpinClick() {
  if (spinning.value) return;

  if (demoEnabled.value) {
    if (spinsCount.value === SPINS_MIN) return spinDemo();
    return spinDemoSlot();
  }

  const balanceNano = toBigNano(useCache.UserData.BalanceNano);
  const totalCostNano = BigInt(calcResult.value) * BigInt(spinsCount.value);

  if (balanceNano < totalCostNano) {
    showErrorToast(t("extra.notEnoughTon"));
    return;
  }

  if (spinsCount.value === SPINS_MIN) return spinNormal();
  return spinSlot();
}

// ===== pricing =====
const calcLoading = ref(false);
const ROULETTE_BASE_MARGIN = 0.15;

const FALLBACK_MIN_COST_NANO = 0.05 * 1e9;
const minBetNano = computed<number>(() => {
  const v = asNum(props.data?.min_bet_nano, 0);
  return Math.round(Math.max(FALLBACK_MIN_COST_NANO, v > 0 ? v : 0));
});

function getMargin(chancePercent: number) {
  if (chancePercent < 20) return ROULETTE_BASE_MARGIN;

  if (chancePercent >= 45) return ROULETTE_BASE_MARGIN * 1.4;
  if (chancePercent >= 40) return ROULETTE_BASE_MARGIN * 1.3;
  if (chancePercent >= 30) return ROULETTE_BASE_MARGIN * 1.15;
  if (chancePercent >= 20) return ROULETTE_BASE_MARGIN * 1.05;

  return ROULETTE_BASE_MARGIN;
}

const calcResult = computed(() => {
  if (!wheelGift.value?.price_nano) return 0;

  const chancePercent = clamp(percent.value, minChance.value, maxChance.value);
  const prize = Number(wheelGift.value.price_nano);
  const p = chancePercent / 100;
  const margin = getMargin(chancePercent);

  const priceByFormula = prize * p * (1 + margin);
  return Math.round(Math.max(priceByFormula, minBetNano.value));
});

// ===== modal/close/end =====
function openWinModal(data: any) {
  const { open } = useModal();
  open(WinModal, { data });
}

function close() {
  if (spinning.value) return;
  emit("close");
}

function onSpinEnd(payload: any) {
  if (payload?.item?.type === "win") {
    openWinModal({ ...wheelGift.value, type: "win", multi: false });
  } else {
    openWinModal({ id: payload?.item?.id, image: BombIcon, name: "Bomb", type: "lose", multi: false });
  }
  spinning.value = false;
}

// ===== rewards =====
async function getRewards() {
  wheelGiftLoading.value = true;
  wheelGift.value = null;

  const res = await APIFortuneTap.rewards(props.data.id).catch(() => null);
  if (!res) {
    wheelGiftLoading.value = false;
    return;
  }

  wheelGift.value = (res.data ?? res) as RewardGift;
  wheelGiftLoading.value = false;
}

onMounted(async () => {
  await getRewards();
});

const wheelSize = ref(340);

const updateWheelSize = () => {
  if (!window.innerHeight) return;

  if (window.innerHeight <= 640) {
    wheelSize.value = 240;
    return;
  }

  if (window.innerHeight <= 740) {
    wheelSize.value = 270;
    return;
  }

  return wheelSize.value = 340;
};

onMounted(() => {
  updateWheelSize();
  window.addEventListener("resize", updateWheelSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateWheelSize);
});
</script>

<template>
  <div class="case-root" v-bind="attrs" :class="{ spinning }">
    <div class="balance">
      <div class="context">
        <h4>{{ cutNumberNano(useCache?.UserData?.BalanceNano ?? 0n, 2) }}</h4>
        <img :src="TonIcon" alt="ton" />
      </div>
      <div class="action">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10.0003 4.16675V15.8334M4.16699 10.0001H15.8337"
            stroke="#1E1E1E"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <div class="sheet">
      <div class="close" :class="{ disabled: spinning }" @click="close">
        <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
      </div>

      <div class="cover">
        <div class="relay">
          <div
            class="background upg"
            :style="{
              '--start-color': '#700053',
              '--center-color': '#2D0C25',
              '--end-color': '#0D0D0F',
            }"
          ></div>
        </div>
      </div>

      <FortuneWheel
        v-if="spinsCount == SPINS_MIN"
        ref="wheelRef"
        :size="wheelSize"
        :spins="6"
        :durationMs="2400"
        :gapDeg="3.5"
        :innerRadius="0.25"
        :ringOuter="0.94"
        :gapColor="'rgba(12,10,16,0.00)'"
        :items="wheelItems"
        @spin-end="onSpinEnd"
      />

      <SlotMachine
        v-if="spinsCount > SPINS_MIN"
        ref="slotRef"
        :items="slotItems"
        :reels-count="spinsCount"
        :visible-rows="3"
        v-model:results="slotsItemsResults"
        :chance="0"
        :chance-max="maxChance"
        bomb-id="bomb"
        gift-id="gift"
        @spin-end="onSlotEnd"
      />

      <div class="ratio-wrap" :class="{ disabled: spinning }">
        <Ratio v-model="percent" :min-value="minChance" :max-value="maxChance" :step="0.001" />
      </div>

      <div class="funcs">
        <div class="demo">
          <div class="text">
            <h4>{{ $t("fortuneTap.modals.gift.demo") }}</h4>
          </div>

          <!-- ✅ УБРАЛ @click.prevent (из-за него чекбокс не тумблился) -->
          <div class="switch" :class="{ disabled: spinning }">
            <label class="ios-switch">
              <input type="checkbox" v-model="demoEnabled" :disabled="spinning" />
              <span class="track"></span>
            </label>
          </div>
        </div>

        <div class="bottomer">
          <div class="right">
            <button :disabled="spinning || spinsCount <= SPINS_MIN" @click="decSpins">
              <img :src="MinusIcon" alt="minus-icon" />
            </button>

            <button class="spins" :disabled="spinning">
              <h4>{{ $t(spinsKey, { count: spinsCount }) }}</h4>
            </button>

            <button :disabled="spinning || spinsCount >= SPINS_MAX" @click="incSpins">
              <img :src="PlusIcon" alt="plus-icon" />
            </button>
          </div>
        </div>
      </div>

      <div class="buttons">
        <button class="primary" :disabled="spinning || wheelGiftLoading" @click="onSpinClick">
          <h4 v-if="demoEnabled">
            {{
              demoEnabled
                ? $t("fortuneTap.modals.gift.demoSpin")
                : spinning
                  ? $t("fortuneTap.modals.gift.spinning")
                  : $t("fortuneTap.modals.gift.spin")
            }}
          </h4>

          <h4 v-if="!demoEnabled">
            <span v-if="wheelGiftLoading">{{ $t("fortuneTap.modals.gift.loading") }}</span>
            <span v-else-if="calcLoading">{{ $t("fortuneTap.modals.gift.calc") }}</span>
            <span v-else>{{ $t("fortuneTap.modals.gift.spinAt", { price: cutNumberNano(calcResult * spinsCount) }) }}</span>
          </h4>

          <img v-if="!demoEnabled && !wheelGiftLoading" :src="TonBlackIcon" alt="ton-icon" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- блокер кликов только во время спина -->
    <div v-if="spinning" class="ui-blocker" aria-hidden="true"></div>
  </div>
</template>

<style lang="scss" src="./Gift.scss" scoped></style>

<style scoped>
.ui-blocker {
  position: absolute;
  inset: 0;
  z-index: 9999;
  background: transparent;
}

.disabled {
  pointer-events: none;
  opacity: 0.75;
}

.ratio-wrap.disabled {
  pointer-events: none;
}
</style>