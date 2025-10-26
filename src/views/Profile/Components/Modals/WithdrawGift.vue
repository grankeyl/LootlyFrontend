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
      <div class="item">
        <div
          class="background upg"
          :style="{
            '--center-color': '#EAB843',
            '--around-color': '#B24C6E',
          }"
        ></div>

        <div class="symbol upg">
          <img src="https://app.spicko-quane.shop/s3/symbols/Teleplane.png" alt="symbol" />
        </div>

        <div class="model">
          <div class="upg">
            <div class="image">
              <img src="https://app.spicko-quane.shop/s3/models/Serphira/Cattie.svg" alt="model" />
            </div>
          </div>
        </div>
      </div>
      <h4>Вывод подарка</h4>
      <p>
        Подтвердите вывод подарка <span>Gift Name</span> в ваш профиль Telegram
      </p>
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

<style lang="scss" src="./WithdrawGift.scss" scoped></style>