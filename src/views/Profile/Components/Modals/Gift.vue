<script setup lang="ts">
// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonIcon from "@/assets/icons/ton.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import ForwardWhiteIcon from "@/assets/icons/forward-white.svg";
import WithdrawIcon from "@/assets/icons/withdraw.svg";

const emit = defineEmits<{
  (e: "open-modal-withdraw-gift"): void;
}>();

function withdraw() {
  emit("open-modal-withdraw-gift");
}
</script>

<template>
  <div class="sheet">
    <div class="cover">
      <div class="relay">
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
      <div class="title">
        <h4>Gift Name</h4>
      </div>
      <div class="actions">
        <button>
          <img :src="ForwardWhiteIcon" alt="close-icon" aria-hidden="true" />
          <h4>Share</h4>
        </button>
        <button @click="withdraw">
          <img :src="WithdrawIcon" alt="close-icon" aria-hidden="true" />
          <h4>Withdraw</h4>
        </button>
      </div>
    </div>
    <div class="table">
      <div class="block">
        <div class="item">
          <div class="left">
            <h4>Floor Price</h4>
          </div>
          <div class="right">
            <h4>2500</h4>
            <img :src="TonIcon" alt="ton-icon" />
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>Model</h4>
          </div>
          <div class="right">
            <h4>Model Name</h4>
            <p>5%</p>
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>Symbol</h4>
          </div>
          <div class="right">
            <h4>Symbol Name</h4>
            <p>4%</p>
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>Background</h4>
          </div>
          <div class="right">
            <h4>Background Name</h4>
            <p>3%</p>
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>Capacity</h4>
          </div>
          <div class="right">
            <h4>0 of 5000</h4>
          </div>
        </div>
      </div>
    </div>
    <div class="info">
      <!-- <div class="item">
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
      </div> -->
    </div>
    <div class="buttons">
      <button>
        <h4>Sell for 225</h4>
        <img :src="TonBlackIcon" alt="close-icon" aria-hidden="true" />
      </button>
      <button>
        <h4>Close</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Gift.scss" scoped></style>