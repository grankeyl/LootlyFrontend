<script setup lang="ts">
import { getImgSvg } from "../../../../utils/useApp";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";

import * as APIMarket from "../../../../api/market";

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import ForwardWhiteIcon from "@/assets/icons/forward-white.svg";

const emit = defineEmits<{ 
  (e:'close'): void; 
  (e:'open-modal-withdraw-gift'): void 
  (e:'buy-success', payload: any): void
}>();

const props = defineProps<{
  data: any
  __modal?: { close: (payload?: any) => void }
}>();

const useCache = useCacheStore() as any;

function close() {
  emit('close');
}

async function buy(
  id: string
) {
  const res = await APIMarket.buy(id).catch(() => null);
  if (!res?.ok) return;

  useCache.UserData.BalanceNano = res.new_balance_nano;
  emit("buy-success", { ...res });
  close();
}
</script>

<template>
  <div class="sheet">
    <div class="cover">
      <div class="relay">
        <div
          class="background upg"
          :style="{
            '--center-color': props.data.bg_center,
            '--around-color': props.data.bg_start,
          }"
        ></div>
        <div class="model">
          <div class="upg">
            <div class="image">
              <img :src="getImgSvg(props.data.image)" alt="model" />
            </div>
          </div>
        </div>
      </div>
      <div class="title">
        <h4>{{ props.data.name }}</h4>
      </div>
      <div class="actions">
        <button>
          <img :src="ForwardWhiteIcon" alt="close-icon" aria-hidden="true" />
          <h4>{{ $t('market.modals.gift.actions.share') }}</h4>
        </button>
      </div>
    </div>
    <div class="table">
      <div class="block">
        <div class="item">
          <div class="left">
            <h4>{{ $t('market.modals.gift.table.floorPrice') }}</h4>
          </div>
          <div class="right">
            <h4>{{ cutNumberNano(props.data.price_nano) }}</h4>
            <img :src="TonIcon" alt="ton-icon" />
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>{{ $t('market.modals.gift.table.gift') }}</h4>
          </div>
          <div class="right">
            <h4>{{ props.data.name }}</h4>
          </div>
        </div>
      </div>
    </div>
    <div class="buttons">
      <button class="primary" @click="buy(props.data.id)">
        <h4>{{ $t('market.modals.gift.buttons.buyFor', { price: cutNumberNano(props.data.price_nano) }) }}</h4>
        <img :src="TonBlackIcon" alt="close-icon" aria-hidden="true" />
      </button>
      <button @click="close">
        <h4>{{ $t('market.modals.gift.buttons.close') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Gift.scss" scoped></style>