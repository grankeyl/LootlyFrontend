<script setup lang="ts">
import { ref } from 'vue'

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonIcon from "@/assets/icons/ton.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg";
import BackspaceIcon from "@/assets/icons/backspace.svg";

const amountStr = ref<string>('0')

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
    <div class="info">
      <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <h4>{{ $t('earn.modals.withdraw.title') }}</h4>
      <p>
        {{ $t('earn.modals.withdraw.descr') }}
      </p>
    </div>
    <div class="input">
      <div class="inner">
        <div class="amount">
          <h4>{{ amountStr }}</h4>
          <p>TON</p>
        </div>
        <div class="image">
          <img :src="TonIcon" alt="ton-icon" aria-hidden="true" />
        </div>
        <div class="max">
          <h4>{{ $t('earn.modals.withdraw.max') }}</h4>
        </div>
      </div>
    </div>
    <div class="num-pad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="tap(n)">{{ n }}</button>
      <button @click="tap('.')">.</button>
      <button @click="tap(0)">0</button>
      <button class="back" @click="backspace">
        <img :src="BackspaceIcon" alt="backspace-icon" />
      </button>
    </div>
    <div class="buttons">
      <button>
        <img :src="AddBlackIcon" alt="add-black-icon" aria-hidden="true" />
        <h4>{{ $t('earn.modals.withdraw.buttons.withdraw') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Withdraw.scss" scoped></style>