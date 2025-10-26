<script setup lang="ts">
import { useCacheStore } from "../../../../stores/pinia-store";

import TelegramModule from "../../../../hooks/useTelegram";

// Icons
import ForwardIcon from "@/assets/icons/forward.svg";

const useCache = useCacheStore() as any;

function inviteFriend() {
  const miniAppLink = import.meta.env.VITE_APP_MINI_APP_LINK;
  const code = useCache.UserData.Code;
  const link = `${miniAppLink}=${code}`;
  const message = `The best app for meme gifts and NFTs ❤️`;
  TelegramModule.useShare(link, message);
}
</script>

<template>
  <div class="apriory">
    <button
      @click="inviteFriend"
      class="button"
      type="button"
    >
      <img :src="ForwardIcon" alt="" aria-hidden="true" />
      <h4>Invite Friends</h4>
    </button>
  </div>
</template>

<style lang="scss" src="./Button.scss" scoped></style>