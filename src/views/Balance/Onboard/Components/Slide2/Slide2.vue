<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";

import ItemImage from "@/assets/images/balance-pg/onboard/slide2/item.png";

// Icons
import StoreIcon from "@/assets/icons/market.svg?raw";

const props = defineProps<{ active: boolean }>();

const root = ref<HTMLElement|null>(null);
const firedOnce = ref(false);

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
  <div class="slide slide5" ref="root">
    <div class="ticker">
      <img :src="ItemImage" alt="crash" />
    </div>
    <div class="context">
      <h4>
        Можно вывести выигранный подарок, либо купленный в 
        <span class="market">
          <div class="kit-icon" v-html="StoreIcon"></div>
          <p>Market</p>
        </span>
        <br>
        Вывод в TON невозможен
      </h4>
    </div>
  </div>
</template>

<style lang="scss" src="./Slide2.scss" scoped></style>
<style scoped lang="scss">
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