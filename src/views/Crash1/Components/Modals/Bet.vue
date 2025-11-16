<script setup lang="ts">
import { cutNumber, tonToNano } from "../../../../utils/useTon";
import { computed, ref } from "vue";
import { Icon } from "../../../../components/Icon";
import { showErrorToast, showSuccessToast } from "../../../../utils/toastManager";
import { useCacheStore } from "../../../../stores/pinia-store";

import * as APICrash from "../../../../api/crash";

// Icons
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import TelegramModule from "../../../../hooks/useTelegram";

const emit = defineEmits<{
  (e:'set-fast-bet', payload: number): void
  (e:'set-game-bet-actual', payload: number): void
  (e:'open-auto-x-popup'): void
  (e:'place-bit', payload: any): void
  (e:'set-game-auto-x', payload: number): void
  (e:'set-game-auto-x-text', payload: string): void
  (e:'set-game-auto-withdraw', payload: boolean): void
  (e:'set-game-auto-bet', payload: boolean): void
  (e: "close"): void;
}>();

type FastBet = any;

const props = defineProps<{
  GameX: number;
  GameBet: number;
  GameBetActual: number;
  GameStatus: string;
  GameLastCrashes: any;

  GameAutoX: number;
  GameAutoXText: string;
  GameAutoWithdraw: boolean;

  GameAutoBet: boolean;
  FastBetList: FastBet[] | any;
  GameBets: any;
}>();

const skeleton = ref(true);
setTimeout(() => (skeleton.value = false), 1000);

const useCache = useCacheStore() as any;

const statusBet = computed(() => {
  if (props.GameStatus === 'prepare' && props.GameBetActual >= 0.1) return 'waiting';
  if (props.GameStatus === 'prepare') return 'prepare';
  if (props.GameStatus === 'playing' && betActual.value >= 0.1) return 'playing';
  return 'none';
});

// --- state ---
const bet = ref<number>(props.GameBet);
const betText = ref<string>(props.GameBet.toString());

const betList = computed(() => props.FastBetList ?? []);
const betActual = computed(() => {
  return props.GameBetActual * props.GameX;
});

const checkMyBet = computed(() => {
  if (!props.GameBets) return false;
  const initData = TelegramModule.initData() as any;
  const userId = initData.user.id;
  return props.GameBets.find((b: any) => b.user_id === userId && b.status === 'active');
});

// --- sanitize как у тебя ---
const sanitizePrice = (str: any, maxDecimals = 2) => {
  if (str == null) return '';
  str = String(str).replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = str.indexOf('.');
  if (firstDot !== -1) {
    str = str.slice(0, firstDot + 1) + str.slice(firstDot + 1).replace(/\./g, '');
  }
  let [int = '', frac = ''] = str.split('.');
  int = int.replace(/^0+(?=\d)/, '') || (str.startsWith('0') ? '0' : '');
  frac = frac.slice(0, maxDecimals);
  if (frac.length > 0) return `${int || '0'}.${frac}`;
  if (str.endsWith('.')) return `${int || '0'}.`;
  return int;
};

const onPriceInput = (e: any, maxDecimals = 2, kind: 'bet'|'auto' = 'bet') => {
  const s = sanitizePrice(e.target.value, maxDecimals);
  e.target.value = s;
  if (kind === 'bet') {
    betText.value = s;                                // показываем ровно то, что ввёл юзер
    bet.value = (s === '' || s === '.') ? 0 : Number(s);
    emit('set-fast-bet', bet.value);
  } else {
    emit('set-game-auto-x-text', s);
    emit('set-game-auto-x', (s === '' || s === '.') ? 0 : Number(s));
  }
};

const onPriceBlur = (e: any, decimals = 2, kind: 'bet'|'auto' = 'bet') => {
  const s = sanitizePrice(e.target.value, decimals);
  const normalized = s ? cutNumber(s, decimals) : '';
  e.target.value = normalized;
  if (kind === 'bet') {
    betText.value = normalized;                       // на блюре аккуратно форматируем
    bet.value = normalized === '' ? 0 : Number(normalized);
    emit('set-fast-bet', bet.value);
  } else {
    emit('set-game-auto-x-text', normalized);
    emit('set-game-auto-x', normalized === '' ? 0 : Number(normalized));
  }
};

function fastBetUse(
  price: number
) {
  bet.value = price;
  emit('set-fast-bet', price);
}

function useAutoBet() {
  emit('set-game-auto-bet', !props.GameAutoBet);
}

function useOpenAutoXPopup() {
  emit('open-auto-x-popup');
}

function useAutoWithdraw() {
  if (props.GameStatus !== 'prepare') return;
  if (props.GameBetActual) return;
  emit('set-game-auto-withdraw', !props.GameAutoWithdraw);
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
      showSuccessToast(`Success get cashout ${s.payout} TON!`);

      const betNano = tonToNano(s.payout);
      const current = toBigInt(useCache.UserData.BalanceNano);
      useCache.UserData.BalanceNano = current + betNano;
      
      emit('set-game-bet-actual', 0);
    });
  }
}

async function usePlaceBit() {
  const initData = TelegramModule.initData() as any;

  if (props.GameStatus === 'playing') {
    const userId = initData.user.id;
    await useCashout(userId);
    return;
  }

  if (props.GameStatus === 'completed') {
    showErrorToast('Place Bit is available only in prepare state');
    return;
  }

  emit('place-bit', { bet: bet.value });
}
</script>

<template>
  <div class="sheet">
    <div class="head">
      <div class="line"></div>
    </div>
    <div class="info">
      <div class="tools">
        <div class="autobet" @click="useAutoBet()">
          <div class="sel" :class="{ active: props.GameAutoBet }">
            <div class="kit-icon" v-html="Icon.Done"></div>
          </div>
          <h4>Auto-bet</h4>
        </div>

        <div class="autowithdraw" :class="{ locked: props.GameStatus !== 'prepare' || props.GameBetActual }" @click="useAutoWithdraw()">
          <div class="sel" :class="{ active: props.GameAutoWithdraw }">
            <div class="kit-icon" v-html="Icon.Done"></div>
          </div>
          <h4>Auto-withdraw</h4>
        </div>
        <div class="value" :class="{ locked: !props.GameAutoWithdraw }" @click="useOpenAutoXPopup()">
          <h4>{{ cutNumber(props.GameAutoX) }}x</h4>
          <div class="kit-icon" v-html="Icon.Pen"></div>
        </div>
      </div>

      <div class="summary">
        <div class="input" :class="{ locked: props.GameStatus !== 'prepare' }">
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Your Price"
            :value="1"
            @input="onPriceInput($event, 2, 'bet')"
            @blur="onPriceBlur($event, 2, 'bet')"
          />
          <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
        </div>
        <div class="select" :class="{ locked: props.GameStatus !== 'prepare' }">
          <div 
            class="item" 
            v-for="(bet, index) in betList" 
            :key="index"
            @click="fastBetUse(bet.price)"
          >
            <h4>{{  bet.price }}</h4>
            <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div class="buttons">
        <button @click="usePlaceBit"
          :class="{ 
            locked: props.GameStatus !== 'prepare' && betActual < 0.1,
            waiting: statusBet === 'waiting',
            prepare: statusBet === 'prepare',
            playing: statusBet === 'playing',
          }"
        >
          <h4 v-if="statusBet === 'none'" class="locked">
            Place Bit
          </h4>
          <h4 v-if="statusBet === 'waiting' && checkMyBet">
            Waiting
          </h4>
          <h4 v-if="statusBet === 'prepare' && (GameStatus === 'prepare')" @click="usePlaceBit">
            Place Bit
          </h4>
          <h4 v-if="statusBet === 'playing' || (checkMyBet && GameStatus === 'playing')" @click="usePlaceBit">
            Pick up {{ cutNumber(betActual) }}
            <img :src="TonBlackIcon" alt="ton-icon" aria-hidden="true" />
          </h4>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Bet.scss" scoped></style>