<script setup lang="ts">
import { getImgSvg } from "../../../../utils/useApp";
import { cutNumberNano } from "../../../../utils/useTon";
import { useCacheStore } from "../../../../stores/pinia-store";

import * as APICases from "../../../../api/cases";

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import ForwardWhiteIcon from "@/assets/icons/forward-white.svg";
import WithdrawIcon from "@/assets/icons/withdraw.svg";
import TelegramModule from "../../../../hooks/useTelegram";

const emit = defineEmits<{ 
  (e:'close'): void; 
  (e:'open-modal-withdraw-gift', payload: any): void 
  (e:'quick-sell-success', payload: any): void
}>();

const props = defineProps<{
  data: any
  __modal?: { close: (payload?: any) => void }
}>();

const useCache = useCacheStore() as any;

function withdraw(data: any) {
  emit("open-modal-withdraw-gift", {
    ...data,
  });
}

function close() {
  emit('close');
}

const checkIfQuickSale = (
  status: string,
  quick_sale: boolean
) => {
  if (status === "sold") return false;
  if (quick_sale) return true;
  return false;
}

async function quickSell(
  id: string
) {
  const res = await APICases.quick_sell(id).catch(() => null);
  if (!res?.ok) return;

  useCache.UserData.BalanceNano = res.new_balance;
  close();
  emit("quick-sell-success", {
    id: id,
    status: "sold",
  });
}

function share(
  id: string
) {
  const miniAppLink = import.meta.env.VITE_APP_MINI_APP_LINK;
  const link = `${miniAppLink}=p_${id}`;
  const message = "Check it.";
  TelegramModule.useShare(link, message);
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
              <img :src="getImgSvg(props.data.reward_image)" alt="model" />
            </div>
          </div>
        </div>
      </div>
      <div class="title">
        <h4>{{ props.data.reward_name }}</h4>
      </div>
      <div class="actions">
        <button @click="share(props.data.id)">
          <img :src="ForwardWhiteIcon" alt="close-icon" aria-hidden="true" />
          <h4>{{ $t('profile.modals.gift.actions.share') }}</h4>
        </button>
        <button @click="withdraw(props.data)">
          <img :src="WithdrawIcon" alt="close-icon" aria-hidden="true" />
          <h4>{{ $t('profile.modals.gift.actions.withdraw') }}</h4>
        </button>
      </div>
    </div>
    <div class="table">
      <div class="block">
        <div class="item">
          <div class="left">
            <h4>{{ $t('profile.modals.gift.table.floorPrice') }}</h4>
          </div>
          <div class="right">
            <h4>{{ cutNumberNano(props.data.price_nano) }}</h4>
            <img :src="TonIcon" alt="ton-icon" />
          </div>
        </div>
        <div class="item">
          <div class="left">
            <h4>{{ $t('profile.modals.gift.table.gift') }}</h4>
          </div>
          <div class="right">
            <h4>{{ props.data.reward_name }}</h4>
          </div>
        </div>
      </div>
    </div>
    <div class="info">
      <!-- <div class="item">
        <div
          class="background upg"
          :style="{
            '--center-color': '#EAB843',
            '--around-color': '#B24C6E',
          }"
        ></div>

        <div class="symbol upg">
          <img src="https://app.spicko-quane.shop/s3/symbols/Teleplane.png" alt="symbol" />
        </div>

        <div class="model">
          <div class="upg">
            <div class="image">
              <img src="https://app.spicko-quane.shop/s3/models/Serphira/Cattie.svg" alt="model" />
            </div>
          </div>
        </div>
      </div> -->
    </div>
    <div class="buttons">
      <button 
        v-if="checkIfQuickSale(props.data.status, props.data.quick_sale)" 
        class="primary"
        @click="quickSell(props.data.id)"
      >
        <h4>{{ $t('profile.modals.gift.buttons.sellFor', { price: cutNumberNano(props.data.price_nano) }) }}</h4>
        <img :src="TonBlackIcon" alt="close-icon" aria-hidden="true" />
      </button>
      <button @click="close">
        <h4>{{ $t('profile.modals.gift.buttons.close') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Gift.scss" scoped></style>