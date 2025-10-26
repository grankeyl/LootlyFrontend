<script setup lang="ts">
import { ref } from 'vue'
import type { ModalExpose } from '../../../../components/common/Modal/modal.types'

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import WalletIcon from "@/assets/icons/wallet.svg?raw";
import TonLineIcon from "@/assets/icons/ton-line.svg";

// Images
import LootlyBalanceBlur from "@/assets/images/earn-pg/bg-blured-lootly-balance.png";

type Result =
  | { type: 'lootly-balance' }
  | { type: 'wallet'; address: string }

const props = defineProps<{ modalId: number } & ModalExpose<Result>>()

const emit = defineEmits<{
  (e: "open-modal-withdraw-balance"): void;
}>();

const { modalId, close, dismiss } = props

const connected = false
const address = ref('UQx...2Rq1')

function chooseLootly() {
  close({ type: 'lootly-balance' })
}
function chooseWallet() {
  emit('open-modal-withdraw-balance');
  // close({ type: 'wallet', address: address.value })
}
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <h4>Куда отправляем?</h4>
      <p>Выводим на игровой баланс Lootly или на внешний TON адрес</p>
    </div>
    <div class="wallet">
      <div class="icon">
        <div v-html="WalletIcon"></div>
      </div>
      <div class="text">
        <p>{{ address }}</p>
      </div>
      <div class="button">
        <div class="context">
          <h4>Connect</h4>
          <img class="ton-line" :src="TonLineIcon" alt="ton-line-icon" />
        </div>
        <!-- <div class="context">
          <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
        </div> -->
      </div>
    </div>
    <div class="selectors">
      <div class="item" @click="chooseWallet">
        <div class="top">
          <p>{{ address }}</p>
        </div>
        <div class="context">
          <div v-html="WalletIcon"></div>
          <h4>Wallet</h4>
        </div>
      </div>
      <div class="item">
        <div class="blur">
          <img :src="LootlyBalanceBlur" alt="blur" />
        </div>
        <div class="context">
          <h4>Lootly Balance</h4>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./ChooseDestination.scss" scoped></style>