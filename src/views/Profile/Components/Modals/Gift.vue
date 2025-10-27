<script setup lang="ts">
// Icons
import TonIcon from "@/assets/icons/ton.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import ForwardWhiteIcon from "@/assets/icons/forward-white.svg";
import WithdrawIcon from "@/assets/icons/withdraw.svg";
import { getImgSvg } from "../../../../utils/useApp";
import { cutNumberNano } from "../../../../utils/useTon";

const emit = defineEmits<{ 
  (e:'close'): void; 
  (e:'open-modal-withdraw-gift'): void 
}>();

const props = defineProps<{
  data: any
  __modal?: { close: (payload?: any) => void }
}>();

function withdraw() {
  emit("open-modal-withdraw-gift");
}

function close() {
  emit('close');
}
</script>

<template>
  <div class="sheet">
    <div class="cover">
      <div class="relay">
        <div
          class="background upg"
          :style="{
            '--center-color': props.data.bg_center,
            '--around-color': props.data.bg_start,
          }"
        ></div>
        <div class="model">
          <div class="upg">
            <div class="image">
              <img :src="getImgSvg(props.data.reward_image)" alt="model" />
            </div>
          </div>
        </div>
      </div>
      <div class="title">
        <h4>{{ props.data.reward_name }}</h4>
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
            <h4>{{ cutNumberNano(props.data.price_nano) }}</h4>
            <img :src="TonIcon" alt="ton-icon" />
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>Gift</h4>
          </div>
          <div class="right">
            <h4>{{ props.data.reward_name }}</h4>
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
        <h4>Sell for {{ cutNumberNano(props.data.price_nano) }}</h4>
        <img :src="TonBlackIcon" alt="close-icon" aria-hidden="true" />
      </button>
      <button @click="close">
        <h4>Close</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Gift.scss" scoped></style>