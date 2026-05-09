<template>
  <view class="category-page">
    <view class="sidebar">
      <scroll-view scroll-y class="sidebar-scroll">
        <view class="sidebar-item" :class="{ active: selectedCategory === 0 }" @click="selectCategory(0)">
          <text>全部</text>
        </view>
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="sidebar-item"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <text>{{ cat.name }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="main">
      <view v-if="subCategories.length > 0" class="tab-bar">
        <scroll-view
          scroll-x
          class="sub-tabs"
          :scroll-into-view="scrollTarget"
          scroll-with-animation
        >
          <view
            v-for="sub in subCategories"
            :key="sub.detId"
            :id="'sub-' + sub.detId"
            class="tab-item"
            :class="{ active: selectedDet === sub.detId }"
            @click="selectSubCategory(sub.detId)"
          >
            <text class="tab-text">{{ sub.detName }}</text>
          </view>
        </scroll-view>
        <view class="sort-wrapper">
          <view class="sort-trigger" :class="{ active: showSortMenu }" @click="toggleSortMenu">
            <text class="sort-text">{{ sortLabels[currentSort] }}</text>
            <text class="sort-arrow" :class="{ rotate: showSortMenu }">▼</text>
          </view>
          <view v-if="showSortMenu" class="sort-overlay" @click="toggleSortMenu"></view>
          <view v-if="showSortMenu" class="sort-dropdown">
            <view
              v-for="(label, key) in sortLabels"
              :key="key"
              class="sort-option"
              :class="{ active: currentSort === key }"
              @click="selectSort(key)"
            >
              <text class="sort-option-text">{{ label }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="sort-bar">
        <view class="sort-item" :class="{ active: currentSort === 'default' }" @click="changeSort('default')">
          <text>推荐</text>
        </view>
        <view class="sort-item" :class="{ active: currentSort === 'newest' }" @click="changeSort('newest')">
          <text>最新</text>
        </view>
        <view class="sort-item" :class="{ active: currentSort === 'sales' }" @click="changeSort('sales')">
          <text>人气</text>
        </view>
      </view>

      <scroll-view
        scroll-y
        class="product-scroll"
        :scroll-into-view="scrollTarget"
        scroll-with-animation
        @scrolltolower="loadMore"
        @scroll="onScroll"
        :lower-threshold="100"
      >
        <block v-if="subCategories.length > 0">
          <view
            v-for="sub in subCategories"
            :key="sub.detId"
            :id="'group-' + sub.detId"
            class="sub-group"
          >
            <view class="sub-header" :id="'sub-' + sub.detId">
              <text class="sub-name">{{ sub.detName }}</text>
              <text class="sub-count">({{ getProductsByDetId(sub.detId).length }})</text>
            </view>
            <view class="sub-product-grid">
              <view class="sub-product-column">
                <ProductCard
                  v-for="product in getProductsByDetIdSplit(sub.detId, 0)"
                  :key="product.id"
                  :product="product"
                  :swipeList="products"
                  :swipeIndex="products.indexOf(product)"
                  sourcePage="category"
                />
              </view>
              <view class="sub-product-column">
                <ProductCard
                  v-for="product in getProductsByDetIdSplit(sub.detId, 1)"
                  :key="product.id"
                  :product="product"
                  :swipeList="products"
                  :swipeIndex="products.indexOf(product)"
                  sourcePage="category"
                />
              </view>
            </view>
          </view>
        </block>

        <view v-else>
          <view class="product-grid">
            <view class="product-column">
              <ProductCard
                v-for="product in productsLeft"
                :key="product.id"
                :product="product"
                :swipeList="products"
                :swipeIndex="products.indexOf(product)"
                sourcePage="category"
              />
            </view>
            <view class="product-column">
              <ProductCard
                v-for="product in productsRight"
                :key="product.id"
                :product="product"
                :swipeList="products"
                :swipeIndex="products.indexOf(product)"
                sourcePage="category"
              />
            </view>
          </view>
          <view v-if="!hasMore" class="load-more">
            <text>没有更多了</text>
          </view>
        </view>
      </scroll-view>

      <view v-if="subCategories.length === 0 && hasMore" class="loading-hint" @click="loadMore">
        <text>点击加载商品</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ProductCard from '../../components/ProductCard.vue'
import { getProducts, getCategories, getCategoryDetails } from '../../api/index.js'
import { clearCache } from '../../utils/cache.js'

const categories = ref([])
const subCategories = ref([])
const products = ref([])
const selectedCategory = ref(0)
const selectedDet = ref(0)
const currentSort = ref('default')
const currentPage = ref(1)
const hasMore = ref(true)
const isLoading = ref(false)
const scrollTarget = ref('')
const scrollInto = ref('')
const activeDet = ref(0)
const showSortMenu = ref(false)
let scrollTimeout = null
let isAnchorScrolling = false

const sortLabels = {
  default: '推荐',
  newest: '最新',
  sales: '人气'
}

const productsLeft = computed(() =>
  products.value.filter((_, i) => i % 2 === 0)
)
const productsRight = computed(() =>
  products.value.filter((_, i) => i % 2 === 1)
)

async function loadSubCategories() {
  if (!selectedCategory.value) {
    subCategories.value = []
    return
  }
  const result = await getCategoryDetails(selectedCategory.value)
  if (result.data.length <= 1) {
    subCategories.value = []
    return
  }
  subCategories.value = result.data
  activeDet.value = result.data[0]?.detId || 0
  selectedDet.value = result.data[0]?.detId || 0
}

async function loadProducts(isLoadMore = false) {
  if (isLoading.value) {
    return
  }
  isLoading.value = true

  const hasSub = subCategories.value.length > 0
  const query = {
    page: currentPage.value,
    pageSize: hasSub ? 9999 : 12
  }

  if (selectedCategory.value) {
    query.category = selectedCategory.value
  }
  query.sort = currentSort.value

  const result = await getProducts(query)

  if (hasSub) {
    hasMore.value = false
  } else if (result.data.length < 12) {
    hasMore.value = false
  }

  products.value = [...products.value, ...result.data]
  currentPage.value++
  isLoading.value = false
}

function selectCategory(id) {
  selectedCategory.value = id
}

function selectSubCategory(detId) {
  selectedDet.value = detId
  activeDet.value = detId
  scrollTarget.value = 'sub-' + detId
  isAnchorScrolling = true
  setTimeout(() => {
    isAnchorScrolling = false
  }, 600)
}

function onScroll(e) {
  if (scrollTimeout || isAnchorScrolling) return
  scrollTimeout = setTimeout(() => {
    scrollTimeout = null
  }, 200)

  if (subCategories.value.length === 0) return

  const query = uni.createSelectorQuery()
  for (const sub of subCategories.value) {
    query.select('#sub-' + sub.detId).boundingClientRect()
  }
  query.exec(res => {
    if (!res || res.length === 0) return

    let bestIndex = -1
    let bestTop = -Infinity

    for (let i = 0; i < subCategories.value.length; i++) {
      if (res[i] && res[i].top <= 120) {
        if (res[i].top > bestTop) {
          bestTop = res[i].top
          bestIndex = i
        }
      }
    }

    if (bestIndex >= 0 && selectedDet.value !== subCategories.value[bestIndex].detId) {
      selectedDet.value = subCategories.value[bestIndex].detId
    }
  })
}

function changeSort(sort) {
  currentSort.value = sort
  currentPage.value = 1
  products.value = []
  hasMore.value = true
  loadProducts()
}

function toggleSortMenu() {
  showSortMenu.value = !showSortMenu.value
}

function selectSort(key) {
  showSortMenu.value = false
  changeSort(key)
}

function getProductsByDetId(detId) {
  const numDetId = typeof detId === 'string' ? parseInt(detId) : detId
  return products.value.filter(p => {
    const pDetId = typeof p.detId === 'string' ? parseInt(p.detId) : p.detId
    return pDetId === numDetId
  })
}

function getProductsByDetIdSplit(detId, col) {
  return getProductsByDetId(detId).filter((_, i) => i % 2 === col)
}

async function loadMore() {
  if (!hasMore.value) return
  await loadProducts(true)
}

onMounted(async () => {
  const pendingCat = uni.getStorageSync('pendingCategory')
  uni.removeStorageSync('pendingCategory')

  const cats = await getCategories()
  categories.value = cats.data

  if (pendingCat && pendingCat > 0) {
    selectedCategory.value = pendingCat
  }

  await loadSubCategories()
  await loadProducts()

  uni.$on('selectCategory', async (id) => {
    if (id && id > 0) {
      selectedCategory.value = id
      await loadSubCategories()
      await loadProducts()
    }
  })
})

onUnmounted(() => {
  uni.$off('selectCategory')
})

onShow(async () => {
  const pendingCat = uni.getStorageSync('pendingCategory')
  if (pendingCat && pendingCat > 0) {
    clearCache('lark_products')
    selectedCategory.value = pendingCat
    uni.removeStorageSync('pendingCategory')
    await loadSubCategories()
    await loadProducts()
  }
})

watch([selectedCategory, currentSort], async () => {
  currentPage.value = 1
  products.value = []
  hasMore.value = true
  await loadSubCategories()
  await loadProducts()
})
</script>

<style scoped>
.category-page {
  display: flex;
  height: 100vh;
  background: #faf7f2;
}

.sidebar {
  width: 180rpx;
  background: #fff;
  border-right: 1rpx solid #F0EBE3;
  flex-shrink: 0;
  height: 100vh;
}

.sidebar-scroll {
  height: 100%;
}

.sidebar-item {
  padding: 32rpx 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: #666;
  position: relative;
}

.sidebar-item.active {
  color: #4a6741;
  font-weight: 600;
  background: #faf7f2;
}

.sidebar-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 32rpx;
  background: #4a6741;
  border-radius: 0 4rpx 4rpx 0;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.tab-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1rpx solid #F0EBE3;
}

.sub-tabs {
  flex: 1;
  white-space: nowrap;
  min-width: 0;
}

.tab-wrap {
  display: flex;
  flex-direction: row;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  padding: 24rpx;
  position: relative;
}

.tab-item.active .tab-text {
  color: #4a6741;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%);
  width: 32rpx;
  height: 4rpx;
  background: #4a6741;
  border-radius: 2rpx;
}

.tab-text {
  font-size: 24rpx;
  color: #666;
}

.sort-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 20rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  gap: 8rpx;
  background: #fff;
  border: 2rpx solid #4A6741;
  border-radius: 32rpx;
}

.sort-text {
  font-size: 24rpx;
  color: #4a6741;
  font-weight: 500;
}

.sort-arrow {
  font-size: 20rpx;
  color: #4a6741;
  transition: transform 0.2s;
}

.sort-arrow.rotate {
  transform: rotate(180deg);
}

.sort-trigger.active {
  background: #4a6741;
}

.sort-trigger.active .sort-text,
.sort-trigger.active .sort-arrow {
  color: #fff;
}

.sort-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.sort-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
}

.sort-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  background: #fff;
  border-radius: 8rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
  overflow: hidden;
  margin-top: 8rpx;
  min-width: 120rpx;
}

.sort-option {
  padding: 20rpx 28rpx;
  text-align: center;
}

.sort-option:active {
  background: #faf7f2;
}

.sort-option.active {
  background: #faf7f2;
}

.sort-option.active .sort-option-text {
  color: #4a6741;
  font-weight: 600;
}

.sort-option-text {
  font-size: 26rpx;
  color: #333;
}

.sort-bar {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #F0EBE3;
  padding: 0 24rpx;
}

.sort-item {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #666;
  position: relative;
}

.sort-item.active {
  color: #4a6741;
  font-weight: 600;
}

.sort-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%);
  width: 32rpx;
  height: 4rpx;
  background: #4a6741;
  border-radius: 2rpx;
}

.product-scroll {
  height: calc(100vh - 100rpx);
}

.product-grid {
  display: flex;
  padding: 0 24rpx;
  gap: 24rpx;
}

.product-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.sub-group {
  margin-bottom: 32rpx;
}

.sub-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 24rpx;
}

.sub-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.sub-count {
  font-size: 22rpx;
  color: #999;
}

.sub-product-grid {
  display: flex;
  padding: 0 24rpx;
  gap: 24rpx;
}

.sub-product-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.load-more {
  text-align: center;
  padding: 32rpx;
  font-size: 24rpx;
  color: #999;
}

.loading-hint {
  text-align: center;
  padding: 120rpx 32rpx;
  font-size: 24rpx;
  color: #999;
}

.loading-hint:active {
  opacity: 0.7;
}
</style>
