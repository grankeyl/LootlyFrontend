<script setup lang="ts">
import { Icon } from "../../../../components/Icon";

// Icons
import MarketIcon from "@/assets/icons/market.svg";
import ChevroneDownIcon from "@/assets/icons/chevrone-down.svg";
import FilterSortIcon from "@/assets/icons/filters/sort.svg";
// import FilterModelIcon from "@/assets/icons/filters/model.svg";
// import FilterSymbolIcon from "@/assets/icons/filters/symbol.svg";
// import FilterBackdropIcon from "@/assets/icons/filters/backdrop.svg";
import FilterPriceIcon from "@/assets/icons/filters/price.svg";
</script>

<template>
  <div class="actions">
    <div class="head">
      <h4>Market</h4>
      <img :src="MarketIcon" alt="market-icon" aria-hidden="true" />
    </div>
    <div class="filters">
      <div class="item">
        <!-- <div class="circle"></div> -->
        <div class="icon">
          <img :src="FilterSortIcon" alt="filter-icon" aria-hidden="true" />
        </div>
        <div class="title">
          <h4>Sort</h4>
        </div>
        <div class="dropdown">
          <img :src="ChevroneDownIcon" alt="chevrone-down-icon" aria-hidden="true" />
        </div>
      </div>
      <!-- <div class="item">
        <div class="circle"></div>
        <div class="icon">
          <img :src="FilterModelIcon" alt="filter-icon" aria-hidden="true" />
        </div>
        <div class="title">
          <h4>Model</h4>
        </div>
        <div class="dropdown">
          <img :src="ChevroneDownIcon" alt="chevrone-down-icon" aria-hidden="true" />
        </div>
      </div>
      <div class="item">
        <div class="circle"></div>
        <div class="icon">
          <img :src="FilterSymbolIcon" alt="filter-icon" aria-hidden="true" />
        </div>
        <div class="title">
          <h4>Symbol</h4>
        </div>
        <div class="dropdown">
          <img :src="ChevroneDownIcon" alt="chevrone-down-icon" aria-hidden="true" />
        </div>
      </div>
      <div class="item">
        <div class="circle"></div>
        <div class="icon">
          <img :src="FilterBackdropIcon" alt="filter-icon" aria-hidden="true" />
        </div>
        <div class="title">
          <h4>Background</h4>
        </div>
        <div class="dropdown">
          <img :src="ChevroneDownIcon" alt="chevrone-down-icon" aria-hidden="true" />
        </div>
      </div> -->
      <div class="item">
        <!-- <div class="circle"></div> -->
        <div class="icon">
          <img :src="FilterPriceIcon" alt="filter-icon" aria-hidden="true" />
        </div>
        <div class="title">
          <h4>Price Range</h4>
        </div>
        <div class="dropdown">
          <img :src="ChevroneDownIcon" alt="chevrone-down-icon" aria-hidden="true" />
        </div>
      </div>
    </div>
    <!-- <div class="cheaps">
      <div class="cheap clear">
        <h4>Clear</h4>
        <div class="kit-icon" v-html="Icon.Close"></div>
      </div>
      <div class="cheap sort">
        <img :src="FilterSortIcon" alt="filter-icon" aria-hidden="true" />
        <h4>Latest</h4>
        <div class="kit-icon" v-html="Icon.Close"></div>
      </div>
      <div class="cheap model">
        <img :src="FilterModelIcon" alt="filter-icon" aria-hidden="true" />
        <h4>Model</h4>
        <div class="kit-icon" v-html="Icon.Close"></div>
      </div>
      <div class="cheap symbol">
        <img :src="FilterSymbolIcon" alt="filter-icon" aria-hidden="true" />
        <h4>Symbol</h4>
        <div class="kit-icon" v-html="Icon.Close"></div>
      </div>
      <div class="cheap backdrop">
        <img :src="FilterBackdropIcon" alt="filter-icon" aria-hidden="true" />
        <h4>Backdrop</h4>
        <div class="kit-icon" v-html="Icon.Close"></div>
      </div>
      <div class="cheap price-range">
        <img :src="FilterPriceIcon" alt="filter-icon" aria-hidden="true" />
        <h4>Price Range</h4>
        <div class="kit-icon" v-html="Icon.Close"></div>
      </div>
    </div> -->
  </div>
</template>

<style lang="scss" src="./Actions.scss" scoped></style>