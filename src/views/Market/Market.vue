<script setup lang="ts">
import { ref } from 'vue';
import { useModal } from './../../components/common/Modal';

// Components
import GiftModal from './Components/Modals/Gift.vue';
import Actions from "./Components/Actions/Actions.vue";
import Gifts from "./Components/Gifts/Gifts.vue";
import Backdrop from "@/assets/images/profile-pg/bg-blured.png";

const { open } = useModal();

const pageRef = ref<HTMLElement | null>(null);
const loaded = ref(false);

function onImageLoad() {
  loaded.value = true;
}

async function openGift(payload: any) {
  const choose = open(GiftModal, {
    data: payload,
    onBuySuccess: (p: any) => buySuccess(p),
  });
  await choose.done.catch(() => null);
}

async function buySuccess(payload: any) {
  console.log(payload);
}
</script>

<template>
  <div class="backdrop" :class="{ loaded }">
    <img :src="Backdrop" alt="backdrop" @load="onImageLoad" />
  </div>

  <div class="page" ref="pageRef">
    <Actions />
    <Gifts 
      :scroll-el="pageRef"
      @open-modal="openGift"
    />
  </div>
</template>

<style lang="scss" src="./Market.scss" scoped></style>
<style scoped lang="scss">
.backdrop {
  opacity: 0;
  transition: opacity 0.6s ease;
  &.loaded {
    opacity: 1;
  }
}
</style>