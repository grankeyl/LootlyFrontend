<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";

import Backdrop from "@/assets/images/earn-pg/bg-blured.png";
import Earn from "@/assets/images/onboard-pg/slide5/earn.png";

// Icons
import FriendsIcon from "@/assets/icons/friends.svg?raw";
import DoneFillIcon from "@/assets/icons/done-fill.svg?raw";
import TicketIcon from "@/assets/icons/ticket.svg?raw";
import TonIcon from "@/assets/icons/ton.svg?raw";

const props = defineProps<{ active: boolean }>();

const root = ref<HTMLElement|null>(null);
const loaded = ref(false);
const firedOnce = ref(false);

function onImageLoad() { loaded.value = true; }

async function fireEnter() {
  if (firedOnce.value) return;
  await nextTick();
  root.value?.classList.add("is-in");
  firedOnce.value = true;
}

watch(() => props.active, (v) => { if (v) fireEnter(); });

onMounted(() => { if (props.active) fireEnter(); });
</script>

<template>
  <div class="backdrop" :class="{ loaded }">
    <img :src="Backdrop" alt="backdrop" @load="onImageLoad" />
  </div>

  <div class="slide slide5" ref="root">
    <div class="ticker">
      <img :src="Earn" alt="crash" />
    </div>
    <div class="context">
      <div class="item">
        <h4>Зови друзей</h4>
        <div class="kit-icon friends" v-html="FriendsIcon"></div>
      </div>
      <div class="item">
        <h4>Делай таски</h4>
        <div class="kit-icon" v-html="DoneFillIcon"></div>
      </div>
      <div class="item">
        <h4>Зарабатывай</h4>
        <div class="kit-icon ticket" v-html="TicketIcon"></div>
        <div class="kit-icon" v-html="TonIcon"></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Slide5.scss" scoped></style>
<style scoped lang="scss">
.backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: var(--max-width);
  pointer-events: none;
  z-index: 0;

  opacity: 0;
  transition: opacity 0.6s ease;
  animation: bgDrift 2s ease-in-out 0.4s infinite alternate;

  &.loaded {
    opacity: 1;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform-origin: 50% 40%;
  }
}

.slide5 {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-left: var(--padding-left);
  gap: 35px;
  z-index: 11;
  position: relative;

  .ticker {
    width: 100%;
    height: fit-content;

    /* стартовое состояние для анимации входа */
    img {
      width: 100%;
      max-width: 300px;
      height: 100%;
      max-height: 244px;
      object-fit: cover;
      opacity: 0;
    }
  }

  .context {
    width: 100%;
    height: fit-content;
    position: absolute;
    bottom: 24%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    text-align: left;
    gap: 10px;
    z-index: 5;
    padding: 0 var(--padding-left);

    .item {
      width: fit-content;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;

      /* стартовое состояние строк */
      opacity: 0;
      transform: translateY(10px) scale(0.98);

      h4 {
        max-width: 420px;
        font-weight: 600;
        font-size: 37px;
        line-height: 43px;
        color: var(--color-white);
      }

      .kit-icon {
        width: 40px;
        height: 40px;
        opacity: 0;
        transform: scale(0.6) rotate(-6deg);
        transform-origin: 50% 50%;

        &.friends {
          :deep(svg) {
            path { fill: var(--color-primary); }
          }
        }

        &.ticket {
          :deep(svg) {
            path { fill: var(--color-gold); }
          }
        }

        :deep(svg) {
          width: 115%;
          height: 115%;
          margin-top: -1px;
          margin-left: -2px;
        }
      }
    }
  }
}

/* === КОГДА СЛАЙД ВКЛЮЧИЛСЯ (.is-in) === */
.slide5.is-in {
  .ticker img {
    /* вход + лёгкое бесконечное покачивание */
    animation:
      tickerEnter 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) 0.04s forwards,
      tickerFloat 5.4s ease-in-out 0.7s infinite alternate;
  }

  /* строки появляются ступенькой */
  .context .item:nth-child(1) {
    animation: itemEnter 0.42s ease-out 0.16s forwards;
  }
  .context .item:nth-child(2) {
    animation: itemEnter 0.42s ease-out 0.30s forwards;
  }
  .context .item:nth-child(3) {
    animation: itemEnter 0.42s ease-out 0.44s forwards;
  }

  /* иконки: поп + бесконечное «подрагивание» */
  .context .item:nth-child(1) .kit-icon {
    animation:
      iconEnter 0.38s ease-out 0.26s forwards,
      iconIdle 3.4s ease-in-out 0.8s infinite;
  }
  .context .item:nth-child(2) .kit-icon {
    animation:
      iconEnter 0.38s ease-out 0.40s forwards,
      iconIdle 3.4s ease-in-out 0.94s infinite;
  }
  .context .item:nth-child(3) .kit-icon {
    animation:
      iconEnter 0.38s ease-out 0.54s forwards,
      iconIdle 3.4s ease-in-out 1.08s infinite;
  }
}

/* === KEYFRAMES === */

@keyframes bgDrift {
  0%   { opacity: 1; }
  50%   { opacity: .76; }
  100%   { opacity: 1; }
}

/* вход тикера */
@keyframes tickerEnter {
  0% {
    opacity: 0;
    transform: scale(0.94);
    filter: blur(6px);
  }
  60% {
    opacity: 1;
    transform: scale(1.01);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}

/* лёгкое вечное покачивание тикера */
@keyframes tickerFloat {
  0%   { transform: scale(1) translateY(1px); }
  50%  { transform: scale(1.02) translateY(-5px); }
  100% { transform: scale(0.99) translateY(1px); }
}

/* вход строк */
@keyframes itemEnter {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* поп иконок при входе */
@keyframes iconEnter {
  0% {
    opacity: 0;
    transform: scale(0.6) rotate(-6deg);
  }
  70% {
    opacity: 1;
    transform: scale(1.05) rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* бесконечная живая микродвижуха иконок */
@keyframes iconIdle {
  0%   { transform: translateY(0) scale(1) rotate(0deg); }
  25%  { transform: translateY(-1px) scale(1.03) rotate(-1.5deg); }
  50%  { transform: translateY(0) scale(0.99) rotate(1deg); }
  75%  { transform: translateY(1px) scale(1.02) rotate(-0.5deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}

/* уважение к уменьшению движения */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>