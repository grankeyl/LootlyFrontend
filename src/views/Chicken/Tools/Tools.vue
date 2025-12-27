<script setup lang="ts">
import { ref } from "vue";
import { useTranslation } from "i18next-vue";
import { cutNumber } from "../../../utils/useTon";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";

const { t } = useTranslation();

const betText = ref<string>('');
const bet = ref<number>(0.1);

const fastBetList = ref<object>([
  { id: 1, price: 0.1, type: "amount" },
  { id: 2, price: 1, type: "amount" },
  { id: 3, price: 3, type: "amount" },
  { id: 4, price: 5, type: "amount" },
  { id: 5, price: t('crash.modals.bet.max') || "MAX", type: "max" },
]) as any;

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
    betText.value = s;
  } else {
    // emit('set-game-auto-x-text', s);
    // emit('set-game-auto-x', (s === '' || s === '.') ? 0 : Number(s));
  }
};

const onPriceBlur = (e: any, decimals = 2, kind: 'bet'|'auto' = 'bet') => {
  const s = sanitizePrice(e.target.value, decimals);
  const normalized = s ? cutNumber(s, decimals) : '';
  e.target.value = normalized;

  if (kind === 'bet') {
    betText.value = normalized;
    bet.value = normalized === '' ? 0 : Number(normalized);
    // emit('set-fast-bet', bet.value);
  } else {
    // emit('set-game-auto-x-text', normalized);
    // emit('set-game-auto-x', normalized === '' ? 0 : Number(normalized));
  }
};
</script>

<template>
  <div class="tools">
    <div class="categories">
      <div class="item active"><h4>Easy</h4></div>
      <div class="item"><h4>Medium</h4></div>
      <div class="item"><h4>Hard</h4></div>
      <div class="item"><h4>Extreme</h4></div>
    </div>
    <div class="summary">
      <div class="input">
        <input
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :placeholder="$t('crash.modals.bet.yourPrice')"
          :value="betText"
          @input="onPriceInput($event, 2, 'bet')"
          @blur="onPriceBlur($event, 2, 'bet')"
        />
        <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      </div>
    </div>
    <div class="select">
      <div 
        class="item" 
        v-for="(bet, index) in fastBetList" 
        :key="index"
      >
        <h4>{{ bet.price }}</h4>
        <img v-if="bet.type && bet.type === 'amount'" :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      </div>
    </div>
          
    <div class="buttons">
      <div class="topper">
        <button>
          <h4>AutoPlay</h4>
        </button>
        <button>
          <h4>Play 500</h4>
          <img :src="TonBlackIcon" alt="ton-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tools.scss" scoped></style>