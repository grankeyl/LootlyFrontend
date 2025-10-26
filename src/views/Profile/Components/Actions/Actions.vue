<script setup lang="ts">
// Icons
import WithdrawIcon from "@/assets/icons/withdraw.svg";
import ChevroneDownIcon from "@/assets/icons/chevrone-down.svg";
import GiftIcon from "@/assets/icons/gift.svg";
import SortIcon from "@/assets/icons/sort.svg";
import ListsIcon from "@/assets/icons/lists.svg";

const emit = defineEmits<{
  (e: "open-modal-withdraw-gifts"): void;
}>();

const props = defineProps<{
  inventoryCount: number;
}>();

function handleClick() {
  emit("open-modal-withdraw-gifts");
}
</script>

<template>
  <div class="actions">
    <div class="head">
      <div class="title">
        <h4>Gifts</h4>
        <p>{{ props.inventoryCount }}</p>
      </div>
      <div class="button">
        <button @click="handleClick">
          <img :src="WithdrawIcon" alt="withdraw-icon" />
          <h4>Withdraw All</h4>
        </button>
      </div>
    </div>
    <div class="filters">
      <div class="items">
        <div class="item">
          <img :src="GiftIcon" alt="gift-icon" />
          <h4>Model</h4>
          <div class="open">
            <img :src="ChevroneDownIcon" alt="chevrone-down-icon" />
          </div>
        </div>
        <div class="item">
          <img :src="SortIcon" alt="sort-icon" />
          <h4>Sort</h4>
          <div class="open">
            <img :src="ChevroneDownIcon" alt="chevrone-down-icon" />
          </div>
        </div>
      </div>
      <div class="display">
        <img :src="ListsIcon" alt="lists-icon" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Actions.scss" scoped></style>