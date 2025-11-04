<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCacheStore } from '../../../../stores/pinia-store';
import { useRouter } from "vue-router";

import * as APIUser from "../../../../api/user";
// Icons
import HashtagIcon from "@/assets/icons/hashtag.svg";
import ChevroneYellowRight from "@/assets/icons/chevrone-yellow-right.svg";

const props = defineProps<{
  photo: string;
  name: string;
}>();

const router = useRouter();
const useCache = ref(useCacheStore()) as any;

const skeletonRank = ref(true);
const rankData = ref<any>({ rank: 0 });

const hasImgError = ref(false);
const imgSrc = ref(props.photo);

function onImgError() {
  hasImgError.value = true;
}

const initials = computed(() => {
  const parts = (props.name || '').trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || 'U';
});

function openLeaderboard() {
  router.push('/leaderboard');
}

async function getRank() {
  if (useCache.value.UserData.Rank) {
    skeletonRank.value = false;
    return;
  };
  const res = await APIUser.rank().catch(() => null);
  if (!res?.rank) return;
  
  rankData.value.rank = res.rank;
  useCache.value.UserData.Rank = res.rank;
  skeletonRank.value = false;
}

onMounted(getRank);
</script>

<template>
  <div class="user">
    <div class="photo">
      <img
        v-if="!hasImgError"
        :src="imgSrc"
        alt="photo"
        @error="onImgError"
      />
      <div v-else class="photo-fallback" aria-label="fallback avatar">
        <span class="initials">{{ initials }}</span>
      </div>
    </div>
    <div class="name">
      <h4>{{ props.name }}</h4>
    </div>
    <div class="leader" :class="{ skeleton: skeletonRank }">
      <div class="sk-load" v-if="skeletonRank"></div>
      <div class="position">
        <img :src="HashtagIcon" alt="hashtag-icon" />
        <p v-if="useCache.UserData?.Rank">{{ useCache.UserData.Rank }}</p>
      </div>
      <div @click="openLeaderboard" class="mark">
        <h4>{{ $t('profile.user.leaderboard') }}</h4>
        <img :src="ChevroneYellowRight" alt="chevrone-yellow-right-icon" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./User.scss" scoped></style>