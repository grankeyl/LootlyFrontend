<script setup lang="ts">
import { cutNumber } from '../../../../utils/useTon';

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";

const emit = defineEmits<{
  (e: 'close'): void
}>();

const props = defineProps<{
  GameAutoX: number;
  OnSetGameAutoX?: (x: number) => void; // <— добавили колбэк
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

const onPriceInput = (e: any, maxDecimals = 2) => {
  const s = sanitizePrice(e.target.value, maxDecimals);
  e.target.value = s;
  const val = s === '' || s === '.' ? 0 : Number(s);
  props.OnSetGameAutoX?.(val);
};

const onPriceBlur = (e: any, decimals = 2) => {
  const s = sanitizePrice(e.target.value, decimals);
  const normalized = s ? cutNumber(s, decimals) : '';
  e.target.value = normalized;
  const val = normalized === '' ? 0 : Number(normalized);
  props.OnSetGameAutoX?.(val);
};

function save() {
  emit('close');
}
</script>

<template>
  <div class="sheet">
    <div class="close" @click="$emit('close')">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <div class="input">
        <input
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Your Price"
          :value="props.GameAutoX"
          @input="onPriceInput($event, 2)"
          @blur="onPriceBlur($event, 2)"
        />
        <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      </div>
    </div>
    <div class="buttons">
      <button @click="$emit('close')">
        <h4>{{ $t('crash.popups.autox.cancel') }}</h4>
      </button>
      <button @click="save()">
        <h4>{{ $t('crash.popups.autox.save') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./AutoX.scss" scoped></style>