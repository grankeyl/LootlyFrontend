<script setup lang="ts">
import { onMounted, useAttrs } from "vue";
import { Icon } from "../../../../components/Icon";
import { cutNumberNanoTrunc } from "../../../../utils/useTon";

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonIcon from "@/assets/icons/ton.svg";

// Images
import Coin from "@/assets/images/crash-pg/coin.svg";

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{ 
  (e:'close'): void;
  (e:'not-enough', payload: any): void;
}>();

const props = defineProps<{ data: any }>();
const attrs = useAttrs()

function close() {
  emit('close');
}

onMounted(() => {
  const el = document.querySelector('.sheet') as HTMLElement;
  if (!el) return;

  const nudge = () => {
    const max = el.scrollHeight - el.clientHeight;
    if (el.scrollTop <= 0) el.scrollTop = 1;               // подпираем верх
    else if (el.scrollTop >= max) el.scrollTop = max - 1;  // подпираем низ
  };

  // при старте и каждом таче держим подпорку
  nudge();
  el.addEventListener('touchstart', nudge, { passive: true });
  el.addEventListener('touchmove', (e) => {
    const max = el.scrollHeight - el.clientHeight;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop >= max;
    if (atTop || atBottom) {
      nudge();
      e.preventDefault(); // блокируем резинку
    }
  }, { passive: false });
});
</script>

<template>
    <div class="case-root" v-bind="attrs">
      <div class="sheet">
        <div class="sheetContent">
          <div class="close" @click="close">
            <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
          </div>
          <div 
            class="backdrop"
            :style="{
              '--case-start-color': `${props.data.BGStart ?? '#79045B'}`,
              '--case-center-color': `${props.data.BGCenter ?? '#2C0422'}`,
              '--case-end-color': `${props.data.BGEnd ?? '#160A14'}`,
            }"
          >
            <div class="backdrop-relay"></div>
          </div>

            <div class="cover-win">
              <div class="lottie-win">
                <Lottie
                  path="/animations/confetti.json"
                  :loop="false"
                  renderer="svg"
                  width="100%"
                  height="100%"
                />
              </div>
              <div class="image-win">
                <div 
                  class="kit-icon" 
                  v-html="Icon.Flower" 
                  :style="{ '--chamomile-color': '#6E225B' }"
                ></div>
              </div>
            </div>

          <div 
            class="cover not-rolling"
          >
            <div class="title">
              <div class="win">
                <h4>{{ $t('cases.modals.case.congrats') }}</h4>
                <span>{{ $t('cases.modals.case.congratsDesc') }}</span>
              </div>
              <div class="coin">
                <img :src="Coin" alt="coin-gold" />
                <h4>{{ data?.amount }}x</h4>
              </div>
              <div class="top">
                <h4>+</h4>
                <button>
                  <h4>{{ cutNumberNanoTrunc(data?.payoutNano) }}</h4>
                  <img :src="TonIcon" alt="ton-icon" />
                </button>
              </div>
            </div>
          </div>

          <div class="buttons win">
            <div class="topper">
              <button @click="close">
                <h4>{{ $t('cases.modals.case.buttons.ok') }}</h4>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
</template>

<style lang="scss" src="./Win.scss" scoped></style>