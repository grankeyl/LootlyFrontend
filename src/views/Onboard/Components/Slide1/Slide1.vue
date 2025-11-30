<script setup lang="ts">
// Images
import LogoImage from "@/assets/images/logo.svg";
import Symbols from "@/assets/images/onboard-pg/slide1/symbols.webp";
import BluredImage from "@/assets/images/onboard-pg/slide1/blured.webp";
import GiftsImage from "@/assets/images/onboard-pg/slide1/gifts.webp";
</script>

<template>
  <div class="slide slide1">
    <div class="logotype">
      <img :src="LogoImage" alt="logotype">
    </div>
    <div class="context">
      <div class="title">
        <h4>Привет! Мы игровая платформа, где ты можешь выиграть Telegram NFT</h4>
      </div>
      <div class="images">
        <div class="inner">
          <div class="symbols">
            <img :src="Symbols" alt="symbols" />
          </div>
          <div class="blured">
            <img :src="BluredImage" alt="blured-image" />
          </div>
          <div class="gifts">
            <img :src="GiftsImage" alt="gifts-image" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Slide1.scss" scoped></style>