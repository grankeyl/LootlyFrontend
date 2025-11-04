<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useModal } from './../../components/common/Modal';
import { useCacheStore } from '../../stores/pinia-store';
import { useRoute } from 'vue-router';

import * as APIUser from './../../api/user';

import User from "./Components/User/User.vue";
import Actions from "./Components/Actions/Actions.vue";
import Gifts from "./Components/Gifts/Gifts.vue";
import WithdrawGiftsModal from './Components/Modals/WithdrawGifts.vue';
import GiftModal from './Components/Modals/Gift.vue';
import WithdrawGiftModal from './Components/Modals/WithdrawGift.vue';

import Backdrop from "@/assets/images/profile-pg/bg-blured.png";

const { open } = useModal();
const route = useRoute()
const useCache = useCacheStore() as any;

const pageRef = ref<HTMLElement|null>(null);
const inventory = ref<any[]>(Array.from({ length: 10 }, () => ({
  id: 1, image: "", name: "", price_nano: 1_000_000_000,
  BGStart: "", BGCenter: "", BGEnd: "", symbol: "",
})));
const inventoryCount = ref(0);

async function openWithdrawGifts() {
  const choose = open(WithdrawGiftsModal);
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

async function quickSellSuccess(payload: any) {
  inventory.value.find(i => i.id === payload.id)!.status = "sold";
}

async function openGift(payload: any) {
  const choose = open(GiftModal, {
    data: payload,
    onQuickSellSuccess: (p: any) => quickSellSuccess(p),
    onOpenModalWithdrawGift: () => open(WithdrawGiftModal, {
      data: payload,
    }),
  });
  await choose.done.catch(() => null);
}

/* === плавное появление задника === */
const loaded = ref(false);
const imgSrc = ref<string | null>(null);

onMounted(async () => {
  const img = new Image();
  img.decoding = 'async';
  img.src = Backdrop;
  try { /* @ts-ignore */ if (typeof img.decode === 'function') await img.decode(); } catch {}
  imgSrc.value = Backdrop;
  loaded.value = true;
});

watch(
  () => route.params.id,
  async (id: any) => {
    if (!id) return

    const res = await APIUser.item(id)
    if (!res) return

    openGift({ ...res.item })
  },
  { immediate: true }
)
</script>

<template>
  <div class="backdrop" :class="{ loaded }">
    <img v-if="imgSrc" :src="imgSrc" alt="backdrop" />
  </div>

  <div class="page" ref="pageRef">
    <User :photo="useCache.UserData.Photo" :name="useCache.UserData.Name" />
    <Actions :inventoryCount="inventoryCount" @open-modal-withdraw-gifts="openWithdrawGifts" />
    <Gifts
      :inventory="inventory"
      :scroll-el="pageRef"
      @open-modal="openGift"
      @inventory-set="inventory = $event"
      @inventory-count="inventoryCount = $event"
    />
  </div>
</template>

<style lang="scss" src="./Profile.scss" scoped></style>
<style scoped lang="scss">
.backdrop{
  opacity:0; transition:opacity .6s ease;
  &.loaded{ opacity:1; }
}
</style>