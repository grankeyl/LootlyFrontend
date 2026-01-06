<script setup lang="ts">
import { ref } from "vue";
import { useTranslation } from "i18next-vue";
import { cutNumber, cutNumberNano, cutNumberNanoTrunc } from "../../../utils/useTon";
import { useCacheStore } from "../../../stores/pinia-store";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import TelegramModule from "../../../hooks/useTelegram";

const { t } = useTranslation();

const useCache = useCacheStore() as any;

const BET_MIN = 0.1;
const BET_MAX = 9999999;

const betText = ref<string>(String(BET_MIN));
const bet = ref<number>(BET_MIN);

type FastBetType = "min" | "max" | "amount";
type FastBetItem = { id: number; price: string | number; type: FastBetType };

const fastBetList = ref<FastBetItem[]>([
  { id: 1, price: t("chicken.bet.min") || "MIN", type: "min" },
  { id: 2, price: 1, type: "amount" },
  { id: 3, price: 3, type: "amount" },
  { id: 4, price: 5, type: "amount" },
  { id: 5, price: t("chicken.bet.max") || "MAX", type: "max" },
]);

const clampBet = (v: number) => {
  if (!Number.isFinite(v) || v < BET_MIN) return BET_MIN;
  if (v > BET_MAX) return BET_MAX;
  return v;
};

const emit = defineEmits<{
  (e:'step'): void
  (e:'cashout'): void
  (e:'set-mode', payload: number): void
  (e:'game-start'): void
  (e:'set-game-bet', payload: number): void
}>();

const props = defineProps<{
  modesActive: string;
  modes: any[];

  gameStarted: boolean;
  gameCashoutNano: number;

  disabled: boolean;
}>();

const sanitizePrice = (str: any, maxDecimals = 2) => {
  if (str == null) return '';
  str = String(str).replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = str.indexOf('.');
  if (firstDot !== -1) {
    str = str.slice(0, firstDot + 1) + str.slice(firstDot + 1).replace(/\./g, '');
  }
  let [int = '', frac = ''] = str.split('.');
  int = int.replace(/^0+(?=\d)/, '') || (str.startsWith('0') ? '0' : '');
  frac = frac.slice(0, maxDecimals);
  if (frac.length > 0) return `${int || '0'}.${frac}`;
  if (str.endsWith('.')) return `${int || '0'}.`;
  return int;
};

const onPriceInput = (e: any, maxDecimals = 2, kind: 'bet'|'auto' = 'bet') => {
  const s = sanitizePrice(e.target.value, maxDecimals);
  e.target.value = s;

  if (kind === 'bet') {
    bet.value = Number(s);
    betText.value = s;
    emit('set-game-bet', Number(s));
  } else {
    // emit('set-game-auto-x-text', s);
    // emit('set-game-auto-x', (s === '' || s === '.') ? 0 : Number(s));
  }
};

const onPriceBlur = (e: any, decimals = 2, kind: 'bet'|'auto' = 'bet') => {
  const s = sanitizePrice(e.target.value, decimals);
  let next = s === '' ? BET_MIN : Number(s);

  next = clampBet(next);

  const normalized = cutNumber(String(next), decimals);
  e.target.value = normalized;

  if (kind === 'bet') {
    bet.value = next;
    betText.value = normalized;
    emit('set-game-bet', next);
  }
};

function onStartGame() {
  TelegramModule.useSoftHaptic();
  emit('game-start');
}

function onStep() {
  TelegramModule.useSoftHaptic();
  emit('step');
}

function applyFastBet(item: FastBetItem) {
  if (props.gameStarted) return;

  const value =
    item.type === 'max'
      ? (cutNumberNano(useCache.UserData.BalanceNano) as any || 0)
      : item.type === 'amount'
        ? item.price
        : BET_MIN;

  bet.value = value as any;
  betText.value = cutNumber(String(value), 2);
  emit('set-game-bet', bet.value);
}

function onModeClick(mode: number) {
  if (props.gameStarted) return;
  emit('set-mode', mode);
}

function onCashout() {
  if (props.gameStarted) {
    TelegramModule.useSoftHaptic();
    emit('cashout');
  };
}
</script>

<template>
  <div class="tools">
    <div class="categories">
      <div 
        v-for="(mode, index) in props.modes"
        :key="index"
        class="item"
        :class="{ active: props.modesActive === mode.type }"
        @click="onModeClick(mode.type)"
      >
        <h4>{{ $t(`chicken.modes.${mode.type}`) }}</h4>
      </div>
    </div>
    <div class="summary">
      <div class="input">
        <input
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :placeholder="$t('chicken.bet.yourPrice')"
          :value="betText"
          @input="onPriceInput($event, 2, 'bet')"
          @blur="onPriceBlur($event, 2, 'bet')"
          :disabled="props.gameStarted"
        />
        <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      </div>
    </div>
    <div class="select">
      <div
        class="item"
        v-for="(item, index) in fastBetList"
        :key="item.id || index"
        @click="applyFastBet(item)"
      >
        <h4>{{ item.price }}</h4>
        <img v-if="item.type === 'amount'" :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      </div>
    </div>
          
    <div class="buttons">
      <div v-if="!props.gameStarted" class="topper">
        <button class="soon" :disabled="disabled">
          <h4>{{ $t('chicken.bet.autoPlay') }}</h4>
          <div class="mark">
            <p>{{ $t('chicken.bet.soon') }}</p>
          </div>
        </button>
        <button @click="onStartGame" :disabled="disabled">
          <h4>{{ $t('chicken.bet.play', { price: bet }) }}</h4>
          <img :src="TonBlackIcon" alt="ton-icon" />
        </button>
      </div>
      <div v-if="props.gameStarted" class="topper">
        <button class="cashout" @click="onCashout" :disabled="disabled">
          <h4>{{ $t('chicken.bet.cashout', { price: cutNumberNanoTrunc(gameCashoutNano, 2) }) }}</h4>
          <img :src="TonWhiteIcon" alt="ton-icon" />
        </button>
        <button @click="onStep" :disabled="disabled">
          <h4>{{ $t('chicken.bet.step') }}</h4>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tools.scss" scoped></style>