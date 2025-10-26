<script setup lang="ts">
// Icons
import CloseIcon from "@/assets/icons/close.svg";
import WithdrawIcon from "@/assets/icons/withdraw.svg";
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <img :src="WithdrawIcon" alt="ton-icon" aria-hidden="true" />
      <h4>Вывод подарков</h4>
      <p>Подтвердите вывод всех ваших подарков в ваш профиль Telegram</p>
    </div>
    <div class="buttons">
      <button>
        <h4>Cancel</h4>
      </button>
      <button>
        <h4>Confirm</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./WithdrawGifts.scss" scoped></style>