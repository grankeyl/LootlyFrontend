<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { uuidv4 } from "../../utils/useApp";
import { cutNumberNanoTrunc, tonToNano } from "../../utils/useTon";
import { showErrorToast, showSuccessToast } from "../../utils/toastManager";
import { useTranslation } from "i18next-vue";
import { useCacheStore } from "../../stores/pinia-store";

import * as chickenApi from "../../api/chicken";

import Game from "./Game/Game.vue";
import Tools from "./Tools/Tools.vue";
import TelegramModule from "../../hooks/useTelegram";

const { t } = useTranslation();
const useCache = useCacheStore() as any;

const router = useRouter();
const gameRef = ref<InstanceType<typeof Game> | null>(null);
const loading = ref(true);

const gameStarted = ref(false);
const gameStep = ref(0);
const gameStepProcessed = ref(false);
const gameBet = ref(0.1);
const gameCashoutNano = ref(0);

const modesActive = ref("easy");
const modes = ref<any[]>([
  { type: "easy", ratios: [] },
  { type: "medium", ratios: [] },
  { type: "hard", ratios: [] },
  { type: "extreme", ratios: [] },
]);

const requestInFlight = ref(false);

async function withRequestLock<T>(fn: () => Promise<T>) {
  if (requestInFlight.value) return;
  requestInFlight.value = true;
  try {
    return await fn();
  } finally {
    requestInFlight.value = false;
  }
}

async function initGame() {
  const res = await chickenApi.init();
  if (!res.ok) return;

  if (res.game && res.game.status === "running") {
    modesActive.value = res.game.mode;
    gameStarted.value = true;
    gameStep.value = Number(res.game.currentStep ?? 0);
    gameCashoutNano.value = res.game.betNano * res.game.currentRatio;
  }

  modes.value = res.modes;
  loading.value = false;
}

/** Любое nano-значение -> bigint (строка/число/bigint) */
function asNanoBigint(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.trunc(v));
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0n;
    // иногда прилетает "123.0" — BigInt такое не ест
    if (s.includes(".")) return BigInt(Math.trunc(Number(s)));
    return BigInt(s);
  }
  return 0n;
}

function getBalanceNano(): bigint {
  return asNanoBigint(useCache?.UserData?.BalanceNano);
}

function setBalanceNano(v: bigint) {
  useCache.UserData.BalanceNano = v; // держим как BigInt стабильно
}

function clearGame() {
  gameStarted.value = false;
  gameStep.value = 0;
  gameCashoutNano.value = 0;

  setTimeout(() => {
    gameStepProcessed.value = false;
    requestInFlight.value = false;
  }, 1250);
}

function setGameStepProcessed(v: boolean) {
  gameStepProcessed.value = v;
}

async function startGame() {
  return withRequestLock(async () => {
    if (gameStepProcessed.value) return;

    gameStep.value = 0;

    const betTon = gameBet.value;
    const betNano = asNanoBigint(tonToNano(betTon));

    const current = getBalanceNano();
    if (current < betNano) {
      showErrorToast(t("extra.notEnoughTon"));
      return;
    }

    gameStepProcessed.value = true;

    const idempotencyKey = uuidv4();
    const res = await chickenApi.start(idempotencyKey, modesActive.value, betTon);
    if (!res.ok) {
      gameStepProcessed.value = false;
      return;
    }

    setBalanceNano(current - betNano);
    gameStarted.value = true;

    if (res.game?.status === "running") {
      gameRef.value?.winStep();
      gameCashoutNano.value = res.game.betNano * res.game.currentRatio;
    } else {
      gameRef.value?.loseStep();
    }
  });
}

async function onStep() {
  return withRequestLock(async () => {
    if (gameStepProcessed.value || loading.value) return;

    const idempotencyKey = uuidv4();
    const res = await chickenApi.step(idempotencyKey);
    if (!res.ok) {
      gameStepProcessed.value = false;
      return;
    }

    gameStepProcessed.value = true;

    if (res.step?.win) {
      gameRef.value?.winStep();
      gameCashoutNano.value = res.game.betNano * res.game.currentRatio;
    } else {
      gameRef.value?.loseStep();
    }
  });
}

async function onCashout() {
  return withRequestLock(async () => {
    const idempotencyKey = uuidv4();
    const res = await chickenApi.cashout(idempotencyKey);
    if (!res.ok) return;

    const payoutNano = asNanoBigint(res.cashout?.payoutNano);
    if (payoutNano > 0n) setBalanceNano(getBalanceNano() + payoutNano);

    clearGame();
    gameRef.value?.cashout();
    showSuccessToast(t('chicken.toasts.cashout', { price: cutNumberNanoTrunc(payoutNano) }));
  });
}

function onSetMode(mode: any) {
  modesActive.value = mode;
}

function onSetGameBet(bet: number) {
  gameBet.value = bet;
}

onMounted(() => {
  TelegramModule.useBackButton(() => router.back());

  const scroller = document.getElementById("scroller");
  if (scroller) {
    scroller.style.overflowY = "hidden";
    scroller.style.touchAction = "none"; // iOS
  }

  setTimeout(() => {
    initGame();
  }, 600);
});

onBeforeUnmount(() => {
  const scroller = document.getElementById("scroller");
  if (scroller) {
    scroller.style.overflowY = "";
    scroller.style.touchAction = "";
  }
});
</script>

<template>
  <div class="chicken">
    <div class="chicken-game">
      <Game
        @clear-game="clearGame"
        @set-game-step-processed="setGameStepProcessed"
        :gameStep="gameStep"
        :modeRatios="modes.find((i) => i.type === modesActive)?.ratios"
        :loading="loading"
        ref="gameRef"
      />
    </div>

    <div class="chicken-tools">
      <Tools
        :disabled="requestInFlight || loading || gameStepProcessed"

        @game-start="startGame"
        @step="onStep"
        @cashout="onCashout"
        @set-mode="onSetMode"
        @set-game-bet="onSetGameBet"

        :modesActive="modesActive"
        :modes="modes"
        :gameStarted="gameStarted"
        :gameCashoutNano="gameCashoutNano"
      />
    </div>
  </div>
</template>

<style lang="scss" src="./Chicken.scss" scoped></style>