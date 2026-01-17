<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { msToWholeSec } from "../../utils/useApp";
import { showErrorToast } from "../../utils/toastManager";
import { useCacheStore } from "../../stores/pinia-store";
import { tonToNano } from "../../utils/useTon";
import { usePopup } from "../../components/common/Popup";
import { useModal } from "../../components/common/Modal";
import { useTranslation } from "i18next-vue";
import { useRouter } from "vue-router";

import * as APICrash from "./../../api/crash";

import Game from "./Components/Game/Game.vue";
import Users from "./Components/Users/Users.vue";
import Header from "../../components/common/Header/Header.vue";
import TelegramModule from "../../hooks/useTelegram";
import AutoXPopup from "./Components/Popups/AutoX.vue";
import Bet from "./Components/Bet/Bet.vue";
import BetModal from "./Components/Modals/Bet.vue";
import WinModal from "./Components/Modals/Win.vue";

import { shootConfetti2 } from "../../utils/useConfetti";

const { t } = useTranslation();
const { open } = usePopup();

const router = useRouter();

const useCache = useCacheStore() as any;

const GameStatus = ref<string>("loading");
const GameBettingEtaMs = ref<number>(3);
const GameX = ref<number>(0);
const GameBet = ref<number>(0.1);
const GameBetLoading = ref<boolean>(false);
const GameBetActual = ref<number>(0);
const GameLastCrashes = ref<object>([]);
const GameBets = ref<object>([]);
const GameOnline = ref<number>(2);

const GameAutoX = ref<number>(1.1);
const GameAutoXText = ref<string>('');
const GameAutoWithdraw = ref(false);

const GameAutoBet = ref(false);

const FastBetList = ref<object>([
  { id: 1, price: 0.1, type: "amount" },
  { id: 2, price: 1, type: "amount" },
  { id: 3, price: 3, type: "amount" },
  { id: 4, price: 5, type: "amount" },
  { id: 5, price: t('crash.modals.bet.max') || "MAX", type: "max" },
]);

let ws: WebSocket | null = null;

onMounted(() => {
  const initData = TelegramModule.initDataRaw()
  const qs = new URLSearchParams({ 'init-data': String(initData) }).toString()

  const url = `${import.meta.env.VITE_APP_SOCKET_CRASH_API_URL}?${qs}`
  ws = new WebSocket(url)

  ws.addEventListener('open', () => {
    // опционально: если сервер ждет ещё "init"-сообщение в payload
    ws?.send(JSON.stringify({ type: 'init' }))
  })

  ws.addEventListener("message", (e: MessageEvent) => {
    if (typeof e.data !== "string") return;
    try {
      const msg = JSON.parse(e.data);
      const msgData = msg;
      if (msgData.last_crashes) {  GameLastCrashes.value = msgData.last_crashes; }
      if (msgData.bets) {  GameBets.value = msgData.bets; }
      if (msgData.online) {  GameOnline.value = msgData.online; }

      if (msgData.phase && msgData.multiplier) {
        if (GameStatus.value !== 'playing') { GameStatus.value = 'playing'; };
        GameX.value = msgData.multiplier;
      }
      if (msgData.phase && msgData.phase === 'countdown') {
        GameStatus.value = 'prepare';
        GameX.value = 0;
        GameBettingEtaMs.value = msToWholeSec(msgData.left_ms);
      }
      if (msgData.phase && msgData.phase === 'round_end') {
        GameStatus.value = 'completed';
        GameX.value = msgData.crash_at;
        GameBetActual.value = 0;
      }
    } catch {}
  });

  ws.addEventListener("error", (err) => {
    console.error("WS error", err);
  });

  ws.addEventListener("close", () => {
    ws = null;
  });
});

onBeforeUnmount(() => {
  ws?.close(1000, "page-unmount");
  ws = null;
});

function toBigInt(v: unknown): bigint {
  return typeof v === 'bigint' ? v : BigInt(String(v ?? 0));
}

async function placeBit(payload: any) {
  if (!payload) return;
  const bet = Number(payload.bet);

  if (!Number.isFinite(bet) || bet < 0.1) {
    showErrorToast(t('extra.minBet', { min: 0.1 }));
    return;
  }

  const betNano = tonToNano(bet);
  const current = toBigInt(useCache.UserData.BalanceNano);

  if (current < betNano) {
    showErrorToast(t('extra.notEnoughTon'));
    GameAutoBet.value = false;
    return;
  }

  if (GameBetLoading.value) return;
  GameBetLoading.value = true;

  const autoCashout = GameAutoWithdraw.value ? GameAutoX.value : 0;
  const res = await APICrash.bet(bet, autoCashout);
  if (res?.status !== 'ok') {
    showErrorToast(res.msg);
    GameBetActual.value = 0;
    GameBetLoading.value = false;
    return;
  };
  if (res.bet) {
    useCache.UserData.BalanceNano = current - betNano;
    GameBetActual.value += bet;
    GameBetLoading.value = false;
  }
}

function setGameBet(value: number) {
  GameBet.value = value;
}

function setGameBetActual(value: number) {
  GameBetActual.value = value;
}

async function openBetModal() {
  const { open } = useModal();

  const choose = open(BetModal, {
        onSetFastBet: (p: number) => setGameBet(p),
        onSetGameBetActual: (p: number) => setGameBetActual(p),
        onOpenAutoXPopup: () => openAutoXPopup(),
        onPlaceBit: (p: any) => placeBit(p),
        onOpenWinModal: (p: any) => openWinModal(p),

        onSetGameAutoX: (p: number) => GameAutoX.value = p,
        onSetGameAutoXText: (p: string) => GameAutoXText.value = p,
        onSetGameAutoWithdraw: (p: boolean) => GameAutoWithdraw.value = p,

        onSetGameAutoBet: (p: boolean) => GameAutoBet.value = p,

        GameX: GameX,
        GameBet: GameBet,
        GameBetActual: GameBetActual,
        GameStatus: GameStatus,
        GameLastCrashes: GameLastCrashes,

        GameAutoX: GameAutoX,
        GameAutoXText: GameAutoXText,
        GameAutoWithdraw: GameAutoWithdraw,

        GameAutoBet: GameAutoBet,
        FastBetList: FastBetList,
        GameBets: GameBets
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

async function openAutoXPopup() {
  const choose = open(AutoXPopup, {
    GameAutoX: GameAutoX.value,
    OnSetGameAutoX: (x: number) => GameAutoX.value = x,
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

async function openWinModal(payload: any) {
  const { open } = useModal();
  const choose = open(WinModal, {
    data: payload,
  });
  shootConfetti2();
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

watch(() => GameStatus.value, (v) => {
  if (!GameAutoBet.value) return;
  if (v === 'prepare') {
    setTimeout(() => placeBit({ bet: GameBet.value }), 350);
  }
});

watch(() => GameAutoBet.value, (v) => {
  if (GameStatus.value !== 'prepare') return;
  if (v) {
    setTimeout(() => placeBit({ bet: GameBet.value }), 350);
  }
});

onMounted(() => {
  TelegramModule.useBackButton(() => router.back());
});
</script>

<template>
  <div class="page" ref="pageRef">
    <Header />

    <div class="content">
      <Game
        @SetGameX="GameX = $event"

        :GameStatus="GameStatus"
        :GameBettingEtaMs="GameBettingEtaMs"
        :GameX="GameX"
        :GameOnline="GameOnline"
        :GameLastCrashes="GameLastCrashes"
      />
      <Bet
        @SetGameBetActual="setGameBetActual"
        @OpenBetModal="openBetModal"
        @OpenWinModal="openWinModal"

        :GameX="GameX"
        :GameBetActual="GameBetActual"
        :GameStatus="GameStatus"
        :GameBets="GameBets"

        :GameAutoX="GameAutoX"
        :GameAutoXText="GameAutoXText"
        :GameAutoWithdraw="GameAutoWithdraw"
      />
      <!-- <Tabs 
        @SetFastBet="GameBet = $event"
        @SetGameBetActual="setGameBetActual"
        @OpenAutoXPopup="openAutoXPopup"
        @PlaceBit="placeBit"

        @SetGameAutoX="GameAutoX = $event"
        @SetGameAutoXText="GameAutoXText = $event"
        @SetGameAutoWithdraw="GameAutoWithdraw = $event"

        @SetGameAutoBet="GameAutoBet = $event"

        :GameX="GameX"
        :GameBet="GameBet"
        :GameBetActual="GameBetActual"
        :GameStatus="GameStatus"
        :GameLastCrashes="GameLastCrashes"

        :GameAutoX="GameAutoX"
        :GameAutoXText="GameAutoXText"
        :GameAutoWithdraw="GameAutoWithdraw"

        :GameAutoBet="GameAutoBet"
        :FastBetList="FastBetList"
        :GameBets="GameBets"
      /> -->
      <Users
        :GameX="GameX"
        :GameStatus="GameStatus"
        :GameBets="GameBets"
      />
    </div>
  </div>
</template>

<style lang="scss" src="./Crash.scss" scoped></style>