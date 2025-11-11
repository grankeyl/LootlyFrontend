<script setup lang="ts">
import { computed, ref } from "vue";
import { cutNumber } from "../../../../utils/useTon";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonWhiteRawIcon from "@/assets/icons/ton-white.svg?raw";
import ChevroneRightIcon from "@/assets/icons/chevrone-right.svg?raw";

const props = defineProps<{
  GameBets: any;
}>();

const skeleton = ref(true);
const users = ref<any[]>(Array.from({ length: 10 }, () => (
  {
    rank: 1,
    username: "leadboy",
    name: "Leadboy",
    sum_volume_nano: 100_000_000_000,
    photo: "",
  }
)));
const bets = computed(() => {
  if (!props.GameBets) return [];
  return [...props.GameBets].reverse();
});

setTimeout(() => {
  skeleton.value = false;
}, 1000);
</script>

<template>
  <div class="users">
    <div class="items">
      <div class="sk-load" v-if="skeleton"></div>
      <div
        class="item"
        v-for="(item, index) in bets"
        :key="index"
      >
        <div class="number">
          <p>#{{ index+1 }}</p>
        </div>
        <div class="image">
          <img v-if="item.user_photo" :src="item.user_photo" alt="">
          <div v-else class="avatar_null">
            <h4 v-if="item.name">{{ item.user_first_name.substring(0, 1) }}</h4>
          </div>
        </div>
        <div class="name">
          <h4 v-if="item.username">@{{ item.username }}</h4>
          <h4 v-else>{{ item.user_first_name }}</h4>
        </div>

        <div v-if="item.value && cutNumber(item.value) === cutNumber(item.amount)" class="button">
          <button>
            <h4>{{ cutNumber(item.amount) }}</h4>
            <img :src="TonWhiteIcon" alt="">
          </button>
        </div>

        <div v-if="item.status === 'active' && item.value && cutNumber(item.value) > cutNumber(item.amount)" class="button">
          <button class="tinted">
            <h4>{{ cutNumber(item.amount) }}</h4>
            <div class="kit-icon" v-html="TonWhiteRawIcon"></div>
          </button>
          <div class="arrow">
            <div class="kit-icon" v-html="ChevroneRightIcon"></div>
          </div>
          <button>
            <h4>{{ cutNumber(item.value) }}</h4>
            <div class="kit-icon" v-html="TonWhiteRawIcon"></div>
          </button>
        </div>

        <div v-if="item.status === 'cashed'" class="button">
          <button class="cashed">
            <h4>{{ cutNumber(item.value) }}</h4>
            <div class="kit-icon" v-html="TonWhiteRawIcon"></div>
          </button>
          <div class="info">
            <h4>2.2x</h4>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Users.scss" scoped></style>