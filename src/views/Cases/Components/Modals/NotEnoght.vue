<script setup lang="ts">
// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg";

const emit = defineEmits<{
  (e: "open-modal-withdraw-balance"): void;
  (e: "close"): void;
}>();

function openDeposit() {
  location.href = '/balance';
}
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <h4>У вас недостаточно TON</h4>
      <p>Пополните баланс и повторите попытку</p>
    </div>
    <div class="buttons">
      <button @click="openDeposit">
        <img :src="AddBlackIcon" alt="add-black-icon" aria-hidden="true" />
        <h4>Deposit</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./NotEnoght.scss" scoped></style>