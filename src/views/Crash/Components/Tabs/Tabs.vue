<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { cutNumber, tonToNano } from "../../../../utils/useTon";
import { showErrorToast, showSuccessToast } from "../../../../utils/toastManager";
import { Icon } from "../../../../components/Icon";
import { useCacheStore } from "../../../../stores/pinia-store";

import * as APICrash from "../../../../api/crash";

import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonBlackIcon from "@/assets/icons/ton-black.svg";
import TelegramModule from "../../../../hooks/useTelegram";

const useCache = useCacheStore() as any;

type FastBet = { id: number; price: number };

const emit = defineEmits<{
  (e:'set-fast-bet', payload: number): void
  (e:'set-game-bet-actual', payload: number): void
  (e:'open-auto-x-popup'): void
  (e:'place-bit', payload: any): void
  (e:'set-game-auto-x', payload: number): void
  (e:'set-game-auto-x-text', payload: string): void
  (e:'set-game-auto-withdraw', payload: boolean): void
  (e:'set-game-auto-bet', payload: boolean): void
}>();

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

// const lastCrashes = computed(() => {
//   if (!props.GameLastCrashes) return [];
//   return [...props.GameLastCrashes].slice(-12).reverse();
// });

function fastBetUse(
  price: number
) {
  bet.value = price;
  emit('set-fast-bet', price);
}

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

function useAutoWithdraw() {
  if (props.GameStatus !== 'prepare') return;
  if (props.GameBetActual) return;
  emit('set-game-auto-withdraw', !props.GameAutoWithdraw);
}

function useAutoBet() {
  emit('set-game-auto-bet', !props.GameAutoBet);
}

function useOpenAutoXPopup() {
  emit('open-auto-x-popup');
}

const statusBet = computed(() => {
  if (props.GameStatus === 'prepare' && props.GameBetActual >= 0.1) return 'waiting';
  if (props.GameStatus === 'prepare') return 'prepare';
  if (props.GameStatus === 'playing' && betActual.value >= 0.1) return 'playing';
  return 'none';
});

watch(() => props.GameBet, (v: any) => {
  betText.value = v.toString();
});

watch(() => props.GameX, (v: any) => {
  if (!props.GameAutoWithdraw) return;
  if (props.GameStatus !== 'playing') return;
  if (betActual.value < 0.1) return;

  if (v >= props.GameAutoX) {
    showSuccessToast(`Success get cashout ${cutNumber(betActual.value)} TON!`);
    const betNano = tonToNano(betActual.value);
    const current = toBigInt(useCache.UserData.BalanceNano);
    useCache.UserData.BalanceNano = current + betNano;
    emit('set-game-bet-actual', 0);
  };
});

onMounted(() => {
  const initData = TelegramModule.initData() as any;
  const userId = initData.user.id;
  const bet = props.GameBets.find((b: any) => b.user_id === userId && b.status === 'active');
  console.log(bet);
  emit('set-game-bet-actual', bet?.amount ?? 0);
});

watch(() => props.GameBets, (v: any) => {
  const initData = TelegramModule.initData() as any;
  const userId = initData.user.id;
  const bet = v.find((b: any) => b.user_id === userId && b.status === 'active');
  console.log(bet);
  emit('set-game-bet-actual', bet?.amount ?? 0);
});
</script>

<template>
  <div class="tabs">
    <!-- <div class="latests">
      <div class="item now">
          <h4 v-if="props.GameX && props.GameX > 0">{{ cutNumber(props.GameX) }}</h4>
          <h4 v-else>Now</h4>
      </div>
      <div class="item" v-for="(item, index) in lastCrashes" :key="index">
          <h4>{{ cutNumber(item) }}</h4>
      </div>
    </div> -->
    <div class="actions">
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
      <div class="top">
        <div class="input" :class="{ locked: props.GameStatus !== 'prepare' }">
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Your Price"
            :value="betText"
            @input="onPriceInput($event, 2, 'bet')"
            @blur="onPriceBlur($event, 2, 'bet')"
          />
          <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
        </div>
        <div 
          class="button" 
          :class="{ 
            locked: props.GameStatus !== 'prepare' && betActual < 0.1,
            waiting: statusBet === 'waiting',
            prepare: statusBet === 'prepare',
            playing: statusBet === 'playing',
          }"
        >
          <button v-if="statusBet === 'none'" class="locked">
            <h4>Place Bit</h4>
          </button>
          <button v-if="statusBet === 'waiting' && checkMyBet">
            <h4>Waiting</h4>
          </button>
          <button v-if="statusBet === 'prepare' && (GameStatus === 'prepare')" @click="usePlaceBit">
            <h4>Place Bit</h4>
          </button>
          <button v-if="statusBet === 'playing' || (checkMyBet && GameStatus === 'playing')" @click="usePlaceBit">
            <h4>Pick up {{ cutNumber(betActual) }}</h4>
            <img :src="TonBlackIcon" alt="ton-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
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
</template>

<style lang="scss" src="./Tabs.scss" scoped></style>