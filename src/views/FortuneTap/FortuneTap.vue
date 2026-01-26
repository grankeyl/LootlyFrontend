<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useModal } from '../../components/common/Modal'
// import { showSuccessToast } from '../../utils/toastManager'
// import { useTranslation } from 'i18next-vue'

import GiftModal from './Components/Modals/Gift.vue'
import Actions from './Components/Actions/Actions.vue'
import Gifts from './Components/Gifts/Gifts.vue'
import Backdrop from '@/assets/images/profile-pg/bg-blured.png'
import TelegramModule from '../../hooks/useTelegram'

const { open } = useModal()
// const { t } = useTranslation()
const route = useRoute()

const pageRef = ref<HTMLElement | null>(null)
const loaded = ref(false)
const backdropOpacity = ref(0)

type ScrollTarget = HTMLElement | Window
let scrollTarget: ScrollTarget | null = null

function isWindow(tgt: ScrollTarget): tgt is Window {
  return tgt === window
}

function getScrollTop(tgt: ScrollTarget) {
  if (isWindow(tgt)) return window.scrollY || document.documentElement.scrollTop || 0
  return tgt.scrollTop
}

function computeOpacity(scrollTop: number) {
  const fadeDistance = 250
  return Math.max(0, 1 - scrollTop / fadeDistance)
}

function onScroll() {
  if (!scrollTarget) return
  backdropOpacity.value = computeOpacity(getScrollTop(scrollTarget))
}

function bindScroll() {
  // реальный скроллер у тебя почти всегда #scroller (см. App.vue)
  const scroller = document.getElementById('scroller')
  scrollTarget = scroller ?? pageRef.value ?? window

  ;(scrollTarget as any).addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

function unbindScroll() {
  if (!scrollTarget) return
  ;(scrollTarget as any).removeEventListener('scroll', onScroll)
  scrollTarget = null
}

function onImageLoad() {
  loaded.value = true
  onScroll()
}

async function openGift(payload: any) {
  const choose = open(GiftModal, {
    data: payload,
  })
  await choose.done.catch(() => null)
}

// function buySuccess(payload: any) {
//   console.log('buy success', payload)
//   showSuccessToast(`${t('extra.successPurchase', { name: payload.name })}`)
// }

onMounted(() => {
  TelegramModule.hideBackButton()
  bindScroll()
})

onBeforeUnmount(() => {
  unbindScroll()
})

watch(
  () => route.params.id,
  async (id: any) => {
    if (!id) return
    // const res = await APIFortuneTap.item(id)
    // if (!res) return
    // openGift({ ...res })
  },
  { immediate: true }
)
</script>

<template>
  <div
    class="backdrop"
    :style="{ opacity: loaded ? backdropOpacity : 0 }"
  >
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

<style lang="scss" src="./FortuneTap.scss" scoped></style>

<style scoped lang="scss">
.backdrop {
  transition: opacity 0.2s ease;
}
</style>