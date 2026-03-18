<script setup lang="ts">
import { onMounted, useAttrs } from "vue";
import { useCacheStore } from "../../../../stores/pinia-store";
import { getImgSvg } from "../../../../utils/useApp";
import { cutNumberNano } from "../../../../utils/useTon";
import { Icon } from "../../../../components/Icon";
import { shootConfetti2 } from "../../../../utils/useConfetti";

import * as APICases from "../../../../api/cases";

// Icons
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import CloseIcon from "@/assets/icons/close.svg";

const attrs = useAttrs()

const emit = defineEmits<{ (e: "close"): void }>();

const props = defineProps<{
  data: any;
  __modal?: { close: (payload?: any) => void };
}>();

const useCache = useCacheStore() as any;

async function quickSell(
  id: string
) {
  const res = await APICases.quick_sell(id).catch(() => null);
  if (!res?.ok) return;

  useCache.UserData.BalanceNano = res.new_balance;
  close();
}

// ===== Actions =====
function close() {
  emit("close");
}

onMounted(() => {
  setTimeout(() => {
    if (props.data.type === 'win') {
      shootConfetti2();
    }
    if (props.data.multi) {
      for (const item of props.data.multiItems) {
        if (item.id === 'gift') {
          shootConfetti2();
        }
      }
    }
  }, 300);
});
</script>

<template>
  <div class="case-root" v-bind="attrs">
    <div class="sheet">
      <div class="close" @click="close">
        <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
      </div>

          <div 
            class="cover"
          >
            <div class="relay">
              <div
                class="background upg"
                :style="{
                  '--start-color': '#700053',
                  '--center-color': '#2D0C25',
                  '--end-color': '#0D0D0F',
                }"
              ></div>
            </div>
        
            <div class="title">
              <div class="win">
                <h4 v-if="props.data.type === 'win'">{{ $t('cases.modals.case.congrats') }}</h4>
                <span>{{ $t('cases.modals.case.congratsDesc') }}</span>
              </div>
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
                  :style="{ '--chamomile-color': '#E837BB' }"
                ></div>
              </div>
            </div>

            <div class="winner-gift">
              <div v-if="!props.data.multi" class="flexed">
                <div class="itm">
                  <div class="item">
                    <div class="image">
                      <img v-if="props.data.type === 'win'"
                      :src="getImgSvg(props.data?.image)" alt="gift image" />
                      <img v-if="props.data.type === 'lose'"
                      :src="props.data?.image" alt="gift image" />
                    </div>
                  </div>
                  <div class="winner-gift-name">
                    <h4>{{ props.data?.name }}</h4>
                  </div>
                </div>
              </div>
              <div v-if="props.data.multi" class="flexed multi">
                <div v-for="(item, index) in props.data.multiItems" :key="index" class="itm">
                  <div class="item">
                    <div class="image">
                      <img v-if="item.id === 'gift'"
                      :src="item.icon" alt="gift image" />
                      <img v-if="item.id === 'bomb'"
                      :src="item.icon" alt="gift image" />
                    </div>
                  </div>
                  <div class="winner-gift-name">
                    <h4>{{ item.label }}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>


      <div v-if="!props.data.multi" class="buttons win">
        <div v-if="props.data.type && props.data.type === 'win'" class="topper px">
          <button>
            <h4>{{ $t('cases.modals.case.buttons.sellForMarket', { price: cutNumberNano((props.data?.price_nano ?? 0) - 1400000000) }) }}</h4>
            <img :src="TonWhiteIcon" alt="ton-icon" />
          </button>
        </div>
        <div v-if="props.data.type && props.data.type === 'win'" class="topper">
          <button @click="quickSell(props.data?.inventory_item_id ?? '')">
            <h4>{{ $t('cases.modals.case.buttons.sellFor', { price: cutNumberNano(props.data?.price_nano ?? 0n) }) }}</h4>
            <img :src="TonBlackIcon" alt="ton-icon" />
          </button>
          <button @click="close()">
            <h4>{{ $t('cases.modals.case.buttons.collect') }}</h4>
          </button>
        </div>
        <div v-else class="topper">
          <button @click="close()">
            <h4>{{ $t('cases.modals.case.buttons.ok') }}</h4>
          </button>
        </div>
      </div>

      <div v-if="props.data.multi" class="buttons win">
        <div class="topper">
          <button @click="close()">
            <h4>{{ $t('cases.modals.case.buttons.ok') }}</h4>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Win.scss" scoped></style>