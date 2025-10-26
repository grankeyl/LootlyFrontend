<script setup lang="ts">
import { ref } from "vue";

// Icons
import LootcoinIcon from "@/assets/icons/lootcoin.svg";
import TonWhite from "@/assets/icons/ton-white.svg";
import ChevroneRight from "@/assets/icons/chevrone-right.svg";

// Images
import Gifted from "@/assets/images/earn-pg/gifted.png";

const skeleton = ref(true);

setTimeout(() => {
  skeleton.value = false;
}, 1000);
</script>

<template>
  <div class="tasks" :class="{ skeleton: skeleton }">
    <div class="primary">
      <div class="sk-load" v-if="skeleton"></div>
      <div class="smb">
        <img :src="Gifted" alt="gifted" />
        <img :src="Gifted" alt="gifted" />
      </div>
      <div class="context">
        <div class="title">
          <p>Получи</p>
          <span>
            100 <img :src="LootcoinIcon" alt="lootcoin-icon" />
          </span>
          <p>за спины</p>
        </div>
        <div class="descr">
          <p>Прокрути TON в кейсах и кайфани</p>
        </div>
      </div>
      <div class="progress">
        <div class="line"></div>
        <div class="info">
          <p>80</p>
          <img :src="TonWhite" alt="ton-icon" />
          <p>200</p>
        </div>
      </div>
    </div>

    <div class="others">
      <div class="other" v-for="value in 3">
        <div class="sk-load" v-if="skeleton"></div>
        <div class="image">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zwhySGCEBxRRFYIcQgvOLOpRGqrT3d7Qng&s" alt="">
        </div>
        <div class="context">
          <h4>Subscribe to Lootly Telegram</h4>
          <span>
            <p>250</p>
            <img :src="LootcoinIcon" alt="lootcoin-icon" />
          </span>
        </div>
        <div class="mark notactive">
          <img :src="ChevroneRight" alt="chevrone-right-icon">
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tasks.scss" scoped></style>