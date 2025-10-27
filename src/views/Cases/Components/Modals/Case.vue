<script setup lang="ts">
import { onMounted, ref, useAttrs, defineOptions } from "vue";
import { cutNumber, cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";
import { Icon } from "../../../../components/Icon";
import { getImgSvg } from "../../../../utils/useApp";

import Lottie from "../../../../components/Lottie.vue";

import * as APICases from "../../../../api/cases";

// Icons
import TonIcon from "@/assets/icons/ton.svg"
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import CloseIcon from "@/assets/icons/close.svg";
// import MinusIcon from "@/assets/icons/minus.svg";
// import PlusIcon from "@/assets/icons/plus.svg";
import Roulette from "@/components/common/Roulette/Roulette.vue";

// Images
import Ton from "@/assets/icons/ton.svg";

const useCache = useCacheStore() as any;

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{ 
  (e:'close'): void; 
}>();

const props = defineProps<{ data: any }>();
const attrs = useAttrs()

const rouletteRef = ref<InstanceType<typeof Roulette> | null>(null);

const isRollClicked = ref(false);
const isRolling = ref(false);
const itemRolling = ref<any>({});

const isWin = ref(false);
const itemWin = ref<any>(null);

const skeletonRewards = ref(true);

const itemRewards = ref<any[]>(
  Array.from({ length: 9 }, () => ({
    bg_start: "#000000",
    bg_center: "#000000",
    bg_end: "#000000",
    image: null,
    price_ton: 100,
    name: "",
    loaded: false,
  }))
);

// --- helpers ---
function preloadImages(urls: (string | null | undefined)[], timeout = 15000) {
  const u = (urls || []).filter(Boolean) as string[];
  if (!u.length) return Promise.resolve();

  return Promise.all(
    u.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const done = () => resolve();
          const tid = setTimeout(done, timeout);
          img.onload = () => {
            clearTimeout(tid);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(tid);
            resolve();
          };
          img.src = src;
        })
    )
  );
}

function clearCase() {
  isRollClicked.value = false;
  isRolling.value = false;
  itemRolling.value = {};
  itemWin.value = {};
  isWin.value = false;
  skeletonRewards.value = false;
}

async function rollToDemo() {
  if (isRollClicked.value || isRolling.value) return;
  if (useCache.UserData.BalanceNano < props.data.price_nano) return;

  console.log(itemRewards.value);
  const rewardCount = itemRewards.value.length;
  const random = Math.floor(Math.random() * rewardCount+1);
  const reward = itemRewards.value[random];

  isRollClicked.value = true;
  isRolling.value = true;
  isWin.value = false;
  itemRolling.value = {
    item_id: reward.id,
    ok: true,
    reward_name: reward.name,
    reward_price: 800000000000,
  };
}

async function rollTo() {
  if (isRollClicked.value || isRolling.value) return;
  if (useCache.UserData.BalanceNano < props.data.price_nano) return;

  isRollClicked.value = true;

  const open = await APICases.open(props.data.ID).catch(() => {
    isRollClicked.value = false;
    isRolling.value = false;
    return null;
  });
  if (!open?.ok) return;

  isRolling.value = true;
  useCache.UserData.BalanceNano -= props.data.price_nano;
  isWin.value = false;
  itemRolling.value = open;
}

async function quickSell(
  id: string
) {
  const res = await APICases.quick_sell(id).catch(() => null);
  if (!res?.ok) return;

  clearCase();
  useCache.UserData.BalanceNano = res.new_balance;
}

function onWin(reward: any) {
  if (reward) {
    itemWin.value = reward;
    if (!itemWin.value.rewardItem.quick_sale) {
      useCache.UserData.BalanceNano += itemWin.value.rewardItem.reward_price;
    }
    isWin.value = true;
  }
}

function skipRoll() {
  rouletteRef.value?.skip();
}

function onCollect() {
  clearCase();
}

async function getRewards() {
  const id = props.data?.ID;
  if (!id) return;

  const cached = useCache.CasesRewardsData?.[id];
  let items: any[] | null = null as any;

  if (cached) {
    items = cached;
  } else {
    const res = await APICases.rewards(id).catch(() => null);
    items = (res?.items ?? res?.data?.items ?? res?.rewards ?? null) as any[] | null;
    if (!items) return; // оставляем скелетон
    useCache.CasesRewardsData = useCache.CasesRewardsData || {};
    useCache.CasesRewardsData[id] = items;
  }

  if (items) {
    await preloadImages(items.map((i: any) => i?.image));
    itemRewards.value = items;
  }
  
  skeletonRewards.value = false;
}

function close() {
  emit('close');
}

onMounted(getRewards);

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
      <div class="balance">
        <div class="context">
          <h4>{{ cutNumberNano(useCache.UserData.BalanceNano, 2) }}</h4>
          <img :src="Ton" alt="ton" />
        </div>
        <div class="action">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.0003 4.16675V15.8334M4.16699 10.0001H15.8337" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="sheet" :class="{ rolling: isRolling }">
        <div class="close" @click="close">
          <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
        </div>

        <div 
          class="backdrop"
          :style="{
            '--case-start-color': `${props.data.BGStart ?? '#000000'}`,
            '--case-center-color': `${props.data.BGCenter ?? '#000000'}`,
            '--case-end-color': `${props.data.BGEnd ?? '#000000'}`,
          }"
        >
          <div class="backdrop-relay"></div>
          <div v-if="!isRolling" class="symbol upg">
            <img :src="getImgSvg(props.data.Symbol)" alt="symbol" />
          </div>
        </div>

        <div 
          v-if="isRolling"
          class="cover"
        >
          <div class="title">
            <div v-if="isWin" class="win">
              <h4>Congrats!</h4>
              <span>You have won:</span>
            </div>
          </div>

          <div v-if="isWin" class="cover-win">
            <div class="lottie-win">
              <Lottie
                slug="confetti"
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
                :style="{ '--chamomile-color': props.data.ChamomileColor }"
              ></div>
            </div>
          </div>

          <div v-if="!isWin" class="roll">
            <Roulette 
              ref="rouletteRef" 
              :Rolling="isRolling"

              :Items="itemRewards"
              :NeedItem="itemRolling"
              @win="onWin"
            />
          </div>

          <div v-if="isWin" class="winner-gift">
            <div
              class="item"
              :style="{ 
                '--bg-start-color': itemWin.bg_start || '#000000',
                '--bg-center-color': itemWin.bg_center || '#000000',
                '--bg-end-color': itemWin.bg_end || '#000000',
              }"
            >
              <div class="image">
                <img :src="getImgSvg(itemWin.image)" alt="gift image" />
              </div>
              <div class="price">
                <p>{{ itemWin.price_ton }}</p>
                <img :src="TonWhiteIcon" alt="ton" />
              </div>
            </div>
            <div class="winner-gift-name">
              <h4>{{ itemWin.name }}</h4>
            </div>
          </div>

        </div>

        <div 
          v-if="!isRolling"
          class="cover not-rolling"
        >
          <div class="relay">
            <div class="model">
              <div class="upg">
                <div class="image">
                  <img :src="getImgSvg(props.data.Image)" alt="model" />
                </div>
              </div>
            </div>
          </div>
          <div class="title">
            <div class="top">
              <h4>{{ props.data.Name }}</h4>
              <button>
                <h4>{{ cutNumberNano(props.data.price_nano) }}</h4>
                <img :src="TonWhiteIcon" alt="ton-icon" />
              </button>
            </div>
            <div v-if="isWin" class="win">
              <h4>Congrats!</h4>
              <span>You have won:</span>
            </div>
          </div>

          <div class="items">
            <div
              class="item"
              v-for="(reward, index) in itemRewards"
              :key="index"
              :class="{ skeleton: skeletonRewards }"
              :style="{ 
                '--bg-start-color': reward.bg_start || '#000000',
                '--bg-center-color': reward.bg_center || '#000000',
                '--bg-end-color': reward.bg_end || '#000000',
              }"
            >
              <div class="sk-load" v-if="skeletonRewards"></div>
              <div class="image">
                <img
                  v-if="getImgSvg(reward.image)"
                  :src="getImgSvg(reward.image)"
                  :class="{ showing: reward.image }"
                  @load="reward.loaded = true"
                  :alt="reward.loaded ? 'gift image' : ''"
                />
              </div>
              <div class="price">
                <p>{{ reward.price_ton }}</p>
                <img :src="TonIcon" alt="ton" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="isRolling && !isWin" class="buttons rolling">
          <div class="topper">
            <button @click="skipRoll">
              <h4>Skip</h4>
            </button>
          </div>
        </div>
        
        <div v-if="isRolling && isWin" class="buttons win">
          <div v-if="itemWin.rewardItem.quick_sale" class="topper">
            <button @click="quickSell(itemWin.rewardItem.reward)">
              <h4>Sell for {{ itemWin.price_ton }}</h4>
              <img :src="TonBlackIcon" alt="ton-icon" />
            </button>
            <button @click="onCollect">
              <h4>Collect</h4>
            </button>
          </div>
          <div v-else class="topper">
            <button @click="onCollect">
              <h4>Ok</h4>
            </button>
          </div>
        </div>
        
        <div v-if="!isRolling" class="buttons">
          <div class="topper">
            <button :disabled="skeletonRewards" @click="rollToDemo()">
              <h4>Demo Open 0</h4>
              <img :src="TonWhiteIcon" alt="ton-icon" />
            </button>
            <button :disabled="skeletonRewards" @click="rollTo()">
              <h4>Open {{ cutNumberNano(props.data.price_nano) }}</h4>
              <img :src="TonBlackIcon" alt="ton-icon" />
            </button>
          </div>
          <!-- <div class="bottomer">
            <div class="left">
              <button :disabled="skeletonRewards"><p>1x</p></button>
              <button :disabled="skeletonRewards"><p>3x</p></button>
              <button :disabled="skeletonRewards"><p>5x</p></button>
            </div>
            <div class="right">
              <button :disabled="skeletonRewards">
                <img :src="MinusIcon" alt="minus-icon" />
              </button>
              <button :disabled="skeletonRewards">
                <h4>2x</h4>
              </button>
              <button :disabled="skeletonRewards">
                <img :src="PlusIcon" alt="plus-icon" />
              </button>
            </div>
          </div> -->
        </div>

      </div>
    </div>
</template>

<style lang="scss" src="./Case.scss" scoped></style>