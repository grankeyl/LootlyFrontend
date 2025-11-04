<script setup lang="ts">
// Icons
import CloseIcon from "@/assets/icons/close.svg";
import { getImgSvg } from "../../../../utils/useApp";

const emit = defineEmits<{ 
  (e:'close'): void; 
}>();

const props = defineProps<{
  data: any
  __modal?: { close: (payload?: any) => void }
}>();

function close() {
  emit('close');
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
      <h4>Вывод подарка</h4>
      <p>
        Подтвердите вывод подарка <span>{{ props.data.reward_name }}</span> в ваш профиль Telegram
      </p>
    </div>
    <div class="buttons">
      <button @click="close">
        <h4>Cancel</h4>
      </button>
      <button>
        <h4>Confirm</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./WithdrawGift.scss" scoped></style>