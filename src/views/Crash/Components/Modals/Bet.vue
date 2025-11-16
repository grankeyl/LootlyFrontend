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

function close() {
  emit('close');
}
</script>

<template>
  <div class="sheet">
    <div class="close" @click="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <h4>{{ $t('cases.modals.notEnoght.title') }}</h4>
      <p>{{ $t('cases.modals.notEnoght.descr') }}</p>
    </div>
    <div class="buttons">
      <button @click="openDeposit">
        <img :src="AddBlackIcon" alt="add-black-icon" aria-hidden="true" />
        <h4>{{ $t('cases.modals.notEnoght.buttons.deposit') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Bet.scss" scoped></style>