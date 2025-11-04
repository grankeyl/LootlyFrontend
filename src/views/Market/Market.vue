<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useModal } from './../../components/common/Modal'

import * as APIMarket from './../../api/market'

import GiftModal from './Components/Modals/Gift.vue'
import Actions from "./Components/Actions/Actions.vue"
import Gifts from "./Components/Gifts/Gifts.vue"
import Backdrop from "@/assets/images/profile-pg/bg-blured.png"

const route = useRoute()
const { open } = useModal()

const pageRef = ref<HTMLElement | null>(null)
const loaded = ref(false)

function onImageLoad() {
  loaded.value = true
}

async function openGift(payload: any) {
  const choose = open(GiftModal, {
    data: payload,
    onBuySuccess: (p: any) => buySuccess(p),
  })
  await choose.done.catch(() => null)
}

function buySuccess(payload: any) {
  console.log('buy success', payload)
}

watch(
  () => route.params.id,
  async (id: any) => {
    if (!id) return

    const res = await APIMarket.item(id)
    if (!res) return

    console.log(res)
    openGift({ ...res.item })
  },
  { immediate: true }
)
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