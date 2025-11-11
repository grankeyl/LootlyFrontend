<script setup lang="ts">
import { getImgSvg } from "../../../../utils/useApp";
import { showErrorToast } from "../../../../utils/toastManager";
import { useTranslation } from "i18next-vue";

import * as APIUser from "../../../../api/user";

// Icons
import CloseIcon from "@/assets/icons/close.svg";

const { t } = useTranslation();

const emit = defineEmits<{ 
  (e:'close'): void; 
  (e:'withdraw-gift-success', payload: any): void;
}>();

const props = defineProps<{
  data: any
  __modal?: { close: (payload?: any) => void }
}>();

function close() {
  emit('close');
}

async function confirm() {
  const res = await APIUser.itemWithdraw(props.data.id).catch(() => null);
  if (!res) {
    showErrorToast(t('extra.somethingWentWrong'));
    return;
  };

  console.log(res);

  close();
  emit('withdraw-gift-success', { 
    id: props.data.id,
    reward_id: props.data.reward_id,
    new_status: res.new_status,
  });
}
</script>

<template>
  <div class="sheet">
    <div class="close" @click="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <div class="item">
        <div class="model">
          <div class="upg">
            <div class="image">
              <img :src="getImgSvg(props.data.reward_image)" alt="model" />
            </div>
          </div>
        </div>
      </div>
      <h4>{{ $t('profile.modals.withdrawGift.title') }}</h4>
      <p v-html="$t('profile.modals.withdrawGift.descr', { name: props.data.reward_name })"></p>
    </div>
    <div class="buttons">
      <button @click="close">
        <h4>{{ $t('profile.modals.withdrawGift.buttons.cancel') }}</h4>
      </button>
      <button @click="confirm">
        <h4>{{ $t('profile.modals.withdrawGift.buttons.confirm') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./WithdrawGift.scss" scoped></style>