<script setup lang="ts">
import { ref } from 'vue'

// Images
import AboutBalanceImg from "@/assets/images/earn-pg/about-balance.png";

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import LootcoinIcon from "@/assets/icons/lootcoin.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg";

const amountStr = ref<string>('0')

const emit = defineEmits<{
  (e: "close"): void;
}>();

function close() {
  emit('close');
}

function tap(val: number | '.') {
  const s = String(amountStr.value)

  if (val === '.') {
    if (!s) { amountStr.value = '0.'; return }
    if (s.includes('.')) return
    amountStr.value = s + '.'
    return
  }

  let next = (s === '0' ? '' : s) + String(val)

  const [int = '', frac = ''] = next.split('.')
  if (frac && frac.length > 9) return

  if (!frac && int.length > 1 && int.startsWith('0')) {
    next = String(Number(int))
  }
  if (next.length > 20) return

  amountStr.value = next
}

function backspace() {
  const s = String(amountStr.value ?? '')
  if (!s) return
  amountStr.value = s.slice(0, -1) || '0'
}
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="cover">
      <img :src="AboutBalanceImg" alt="about-balance" />
    </div>
    <div class="info">
      <img :src="LootcoinIcon" alt="">
      <h4>Lootly Coin</h4>
      <p>
        Additional balance in the app, used for airdrops
      </p>
    </div>
    <div class="buttons">
      <button @click="close">
        <h4>Okey</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./BalanceAbout.scss" scoped></style>