<script setup lang="ts">
import { ref } from 'vue'
import { showToast } from '../../../../utils/toastManager';
import { tonConnectUI } from '../../../../hooks/useTonConnect';
import { beginCell, toNano, Address } from '@ton/core';

import * as APIWallet from '../../../../api/wallet';

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonIcon from "@/assets/icons/ton.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg";
import BackspaceIcon from "@/assets/icons/backspace.svg";


const amountStr = ref<string>('5')

function tap(val: number | '.') {
  const s = String(amountStr.value)

  if (val === '.') {
    if (!s) { amountStr.value = '0.'; return }
    if (s.includes('.')) return
    amountStr.value = s + '.'
    return
  }

  let next = (s === '0' ? '' : s) + String(val)

  const [int = '', frac = ''] = next.split('.')
  if (frac && frac.length > 9) return // максимум 9 знаков после точки

  if (!frac && int.length > 1 && int.startsWith('0')) {
    next = String(Number(int))
  }
  if (next.length > 20) return

  amountStr.value = next
}

function backspace() {
  const s = String(amountStr.value ?? '')
  if (!s) return
  amountStr.value = s.slice(0, -1) || '0'
}

async function deposit() {
  const n = parseFloat(amountStr.value.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0.1) return;

  const [i = '0', f = ''] = String(n).split('.');
  const frac = (f + '000000000').slice(0, 9);
  const nano = (BigInt(i) * 1_000_000_000n) + BigInt(frac);

  const res = await APIWallet.deposit(Number(nano));
  if (res) {
    await sendPayment(res.address, res.memo, n);
    showToast('Wallet connected', 'success');
  } else {
    showToast('Wallet not connected', 'error');
  }
}

async function sendPayment(receiverAddress: string, memo: string, amountTon: number) {
  const body = beginCell()
    .storeUint(0, 32)
    .storeStringTail(String(memo ?? ""))
    .endCell();

  const tx = {
    validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
    messages: [
      {
        address: Address.parse(receiverAddress).toString(),
        amount: toNano(amountTon).toString(),
        payload: body.toBoc().toString('base64'),
      },
    ],
  };

  await tonConnectUI.sendTransaction(tx);
}
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <h4>Пополнение баланса</h4>
      <p>
        *ВАЖНО! Вы не можете выводить TON с баланса, вывести можно только подарки, выигранные или купленные в маркете
      </p>
    </div>
    <div class="input">
      <div class="inner">
        <div class="amount">
          <h4>{{ amountStr }}</h4>
          <p>TON</p>
        </div>
        <div class="image">
          <img :src="TonIcon" alt="ton-icon" aria-hidden="true" />
        </div>
        <div class="max">
          <h4>МАКС</h4>
        </div>
      </div>
    </div>
    <div class="num-pad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="tap(n)">{{ n }}</button>
      <button @click="tap('.')">.</button>
      <button @click="tap(0)">0</button>
      <button class="back" @click="backspace">
        <img :src="BackspaceIcon" alt="backspace-icon" />
      </button>
    </div>
    <div class="buttons">
      <button @click="deposit">
        <img :src="AddBlackIcon" alt="add-black-icon" aria-hidden="true" />
        <h4>Deposit</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Deposit.scss" scoped></style>