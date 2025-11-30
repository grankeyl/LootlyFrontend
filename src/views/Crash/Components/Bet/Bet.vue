<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { cutNumberNano, tonToNano } from '../../../../utils/useTon';
import { showSuccessToast } from '../../../../utils/toastManager';
import { useCacheStore } from '../../../../stores/pinia-store';
import { useTranslation } from 'i18next-vue';

import * as APICrash from '../../../../api/crash';

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

  GameAutoX: number;
  GameAutoXText: string;
  GameAutoWithdraw: boolean;
}>();

const useCache = useCacheStore() as any;

const betActual = computed(() => {
  const fallbackBet = checkMyBet.value ? Number(checkMyBet.value.amount ?? 0) : 0;
  const bet = Number(props.GameBetActual || fallbackBet || 0); // тут пусть будет TON
  const x = Number(props.GameX || 1);
  return bet * x; // TON
});

const betActualNano = computed(() => {
  return tonToNano(betActual.value);
});

const statusBet = computed(() => {
  if (props.GameStatus === 'prepare' && props.GameBetActual >= 0.1) return 'waiting';
  if (props.GameStatus === 'prepare') return 'prepare';
  if (checkMyBet.value && props.GameStatus === 'playing') return 'playing';
  if (props.GameStatus === 'playing' && betActual.value >= 0.1) return 'playing';
  return 'none';
});

const checkMyBet = computed(() => {
  if (!props.GameBets || !Array.isArray(props.GameBets)) return null;

  const userId = Number(useCache.UserData.Tld);

  return (
    props.GameBets.find((b: any) => {
      const betUserId = Number(b.user_id || b.userId || 0);
      return betUserId === userId && b.status === 'active';
    }) || null
  );
});

const cashoutLoading = ref(false);

function openBetModal() {
  emit('open-bet-modal');
}

function toBigInt(v: unknown): bigint {
  return typeof v === 'bigint' ? v : BigInt(String(v ?? 0));
}

async function useCashout() {
  if (cashoutLoading.value) return;
  cashoutLoading.value = true;

  if (props.GameStatus !== 'playing') { 
    cashoutLoading.value = false; 
    return; 
  }

  const res = await APICrash.cashout().catch(() => null);

  if (res?.status !== 'ok') { 
    cashoutLoading.value = false; 
    return; 
  }

  if (res.settled) {
    res.settled.forEach((s: any) => {
      cashoutLoading.value = false;
      showSuccessToast(
        t('crash.bet.successGetCashout', { price: cutNumberNano(s.payout) })
      );

      const current = toBigInt(useCache.UserData.BalanceNano);
      const betNano = toBigInt(s.payout);

      useCache.UserData.BalanceNano = current + betNano;

      emit('set-game-bet-actual', 0);
    });
  }
}

function onButtonClick() {
  if (statusBet.value === 'none' || !props.GameStatus) {
    openBetModal();
    return;
  }

  if (statusBet.value === 'playing' || (checkMyBet.value && props.GameStatus === 'playing')) {
    useCashout();
  } else {
    openBetModal();
  }
}

watch(() => props.GameX, (v) => {
  if (props.GameAutoWithdraw) {
    if (v === props.GameAutoX) {
      showSuccessToast(`Success get cashout ${cutNumberNano(betActualNano.value)} TON!`);
      useCashout();
    }
  }
});
</script>

<template>
  <div class="bet">
    <button
      @click="onButtonClick"
      :class="{
        waiting: statusBet === 'waiting',
        prepare: statusBet === 'prepare',
        playing: statusBet === 'playing',
      }"
    >
      <span class="label">
        <template v-if="statusBet === 'none'">
          {{ $t('crash.bet.placeBit') }}
        </template>

        <template v-else-if="statusBet === 'waiting'">
          {{ $t('crash.bet.waiting') }}
        </template>

        <template v-else-if="statusBet === 'prepare'">
          {{ $t('crash.bet.placeBit') }}
        </template>

        <template v-else-if="statusBet === 'playing' || checkMyBet && GameStatus === 'playing'">
          <p>{{ $t('crash.bet.pickUp', { price: cutNumberNano(betActualNano ?? 0n) }) }}</p>
          <img :src="TonBlackIcon" alt="ton-icon" aria-hidden="true" />
        </template>
      </span>
    </button>

    <!-- дебаг, можешь оставить/удалить -->
    <!--
    <div class="debug">
      statusBet: {{ statusBet }} |
      hasActiveBet: {{ hasActiveBet ? 'yes' : 'no' }}
    </div>
    -->
  </div>
</template>

<style lang="scss" src="./Bet.scss" scoped></style>