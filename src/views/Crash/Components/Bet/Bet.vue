<script setup lang="ts">
import { computed } from 'vue';
import { cutNumber, tonToNano } from '../../../../utils/useTon';
import { showSuccessToast } from '../../../../utils/toastManager';
import { useCacheStore } from '../../../../stores/pinia-store';
import { useTranslation } from 'i18next-vue';

import * as APICrash from '../../../../api/crash';

// Components
import TelegramModule from '../../../../hooks/useTelegram';

// Icons
import TonBlackIcon from "@/assets/icons/ton-black.svg";

const { t } = useTranslation();

const emit = defineEmits<{
  (e:'open-bet-modal'): void
  (e:'set-game-bet-actual', payload: number): void
}>();

const props = defineProps<{
  GameX: number;
  GameBetActual: number;
  GameStatus: string;
  GameBets: any;
}>();

const useCache = useCacheStore() as any;

const betActual = computed(() => {
  const bet = Number(props.GameBetActual) || 0;
  const x   = Number(props.GameX) || 0;
  return bet * x;
});

const statusBet = computed(() => {
  if (props.GameStatus === 'prepare' && props.GameBetActual >= 0.1) return 'waiting';
  if (props.GameStatus === 'prepare') return 'prepare';
  if (props.GameStatus === 'playing' && betActual.value >= 0.1) return 'playing';
  return 'none';
});

const checkMyBet = computed(() => {
  if (!props.GameBets) return false;
  const initData = TelegramModule.initData() as any;
  const userId = initData.user.id;
  return props.GameBets.find((b: any) => b.user_id === userId && b.status === 'active');
});

function openBetModal() {
  emit('open-bet-modal');
}

function toBigInt(v: unknown): bigint {
  return typeof v === 'bigint' ? v : BigInt(String(v ?? 0));
}

async function useCashout(
  userId: number
) {
  if (props.GameStatus !== 'playing') return;
  const res = await APICrash.cashout(userId).catch(() => null);
  if (res?.status !== 'ok') return;
  if (res.settled) {
    res.settled.forEach((s: any) => {
      showSuccessToast(t('crash.bet.successGetCashout', { price: cutNumber(s.payout) }));

      const betNano = tonToNano(s.payout);
      const current = toBigInt(useCache.UserData.BalanceNano);
      useCache.UserData.BalanceNano = current + betNano;
      
      emit('set-game-bet-actual', 0);
    });
  }
}

function onButtonClick() {
  if (statusBet.value === 'none') {
    openBetModal();
    return;
  }

  if (!props.GameStatus) {
    openBetModal();
    return;
  }

  const initData = TelegramModule.initData() as any;

  if (statusBet.value === 'playing' || (checkMyBet.value && props.GameStatus === 'playing')) {
    useCashout(initData.user.id);
  } else {
    openBetModal();
  }
}
</script>

<template>
  <div class="bet">
        <button @click="onButtonClick"
          :class="{ 
            waiting: statusBet === 'waiting',
            prepare: statusBet === 'prepare',
            playing: statusBet === 'playing',
          }"
        >
          <span v-if="statusBet === 'none'" class="locked">
            <div>
              {{ $t('crash.bet.placeBit') }}
            </div>
          </span>
          <span v-if="statusBet === 'waiting' && checkMyBet">
            <div>
              {{ $t('crash.bet.waiting') }}
            </div>
          </span>
          <span v-if="statusBet === 'prepare' && (GameStatus === 'prepare')" @click="onButtonClick">
            <div>
              {{ $t('crash.bet.placeBit') }}
            </div>
          </span>
          <span v-if="statusBet === 'playing' && (checkMyBet && GameStatus === 'playing')" @click="onButtonClick">
            <div>
              <p>{{ $t('crash.bet.pickUp', { price: cutNumber(betActual) }) }}</p>
              <img :src="TonBlackIcon" alt="ton-icon" aria-hidden="true" />
            </div>
          </span>
        </button>
  </div>
</template>

<style lang="scss" src="./Bet.scss" scoped></style>