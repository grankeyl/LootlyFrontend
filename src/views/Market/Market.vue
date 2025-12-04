<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useModal } from './../../components/common/Modal'
import { showSuccessToast } from '../../utils/toastManager'
import { useTranslation } from 'i18next-vue'

import * as APIMarket from './../../api/market'

import GiftModal from './Components/Modals/Gift.vue'
import Actions from "./Components/Actions/Actions.vue"
import Gifts from "./Components/Gifts/Gifts.vue"
import Backdrop from "@/assets/images/profile-pg/bg-blured.png"
import NotEnoght from './Components/Modals/NotEnoght.vue'

const { open } = useModal()
const { t } = useTranslation()

const route = useRoute()

const pageRef = ref<HTMLElement | null>(null)
const loaded = ref(false)

function onImageLoad() {
  loaded.value = true
}

async function openGift(payload: any) {
  const choose = open(GiftModal, {
    data: payload,
    onBuySuccess: (p: any) => buySuccess(p),
    onNotEnough: (p: any) => openNotEnoght(p),
  })
  await choose.done.catch(() => null)
}

async function openNotEnoght(payload: any) {
  const choose = open(NotEnoght, {
    data: payload,
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

function buySuccess(payload: any) {
  console.log('buy success', payload);
  showSuccessToast(`${t('extra.successPurchase', { name: payload.name })}`);
}

watch(
  () => route.params.id,
  async (id: any) => {
    if (!id) return

    const res = await APIMarket.item(id)
    if (!res) return

    openGift({ ...res })
  },
  { immediate: true }
)
</script>

<template>
  <div class="backdrop" :class="{ loaded }">
    <img :src="Backdrop" alt="backdrop" @load="onImageLoad" />
  </div>

  <div class="pageMarket" ref="pageRef">
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