<template>
  <view class="index-page">
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-content">
        <text class="title">菓然手作</text>
        <view class="search-bar" @click="goSearch">
          <image class="search-icon" src="/static/images/search.png" mode="aspectFit" />
          <text class="search-text">搜索手作好物</text>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="scroll-content"
      :style="{ paddingTop: headerHeight + 'px' }"
      refresher-enabled
      :refresher-triggered="false"
      @refresherrefresh="onRefresh"
    >
      <view class="banner-wrap">
        <swiper class="banner-swiper" circular autoplay :interval="4000" :duration="500">
          <swiper-item v-for="banner in banners" :key="banner.id">
            <view class="banner-item" :style="{ background: bannerGradients[banner.id % bannerGradients.length] }">
              <text class="banner-title">{{ banner.title }}</text>
              <text class="banner-subtitle">{{ banner.subtitle }}</text>
            </view>
          </swiper-item>
        </swiper>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">手作</text>
        </view>
        <view class="category-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            @click="selectCategory(cat.id)"
          >
            <image class="category-icon-img" :src="'/static/images/cat-' + cat.id + '.png'" mode="aspectFit" />
            <text class="category-name">{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">热门推荐</text>
          <text class="section-more" @click="goCategory(0)">查看更多</text>
        </view>
        <view class="product-grid">
          <view class="product-column">
            <ProductCard
              v-for="(product, idx) in hotProductsLeft"
              :key="product.id"
              :product="product"
            />
          </view>
          <view class="product-column">
            <ProductCard
              v-for="(product, idx) in hotProductsRight"
              :key="product.id"
              :product="product"
            />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">创作者</text>
          <text class="section-more" @click="goCreatorList">查看全部</text>
        </view>
        <view class="creators-wrap">
          <CreatorCard
            v-for="creator in topCreators"
            :key="creator.id"
            :creator="creator"
          />
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">上新推荐</text>
        </view>
        <view class="product-grid">
          <view class="product-column">
            <ProductCard
              v-for="(product, idx) in newProductsLeft"
              :key="product.id"
              :product="product"
            />
          </view>
          <view class="product-column">
            <ProductCard
              v-for="(product, idx) in newProductsRight"
              :key="product.id"
              :product="product"
            />
          </view>
        </view>
      </view>

      <view class="footer">
        <text class="footer-text">菓然手作 · 发现生活中的美好</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ProductCard from '../../components/ProductCard.vue'
import CreatorCard from '../../components/CreatorCard.vue'
import { getBanners, getCategories, getHotProducts, getNewProducts, getCreators } from '../../api/index.js'
import { clearCache } from '../../utils/cache.js'

const statusBarHeight = ref(0)
const headerHeight = ref(0)
const banners = ref([])
const categories = ref([])
const hotProducts = ref([])
const newProducts = ref([])
const creators = ref([])

const topCreators = computed(() =>
  [...creators.value]
    .sort((a, b) => {
      if ((b.worksCount || 0) !== (a.worksCount || 0)) {
        return (b.worksCount || 0) - (a.worksCount || 0)
      }
      return (b.followers || 0) - (a.followers || 0)
    })
    .slice(0, 3)
)

const bannerGradients = [
  'linear-gradient(135deg, #E8D5BC 0%, #D5C4A8 100%)',
  'linear-gradient(135deg, #D5E8D4 0%, #B8D4B6 100%)',
  'linear-gradient(135deg, #E8D4E5 0%, #D4B8D0 100%)'
]

const hotProductsLeft = computed(() =>
  hotProducts.value.slice(0, 6).filter((_, i) => i % 2 === 0)
)
const hotProductsRight = computed(() =>
  hotProducts.value.slice(0, 6).filter((_, i) => i % 2 === 1)
)
const newProductsLeft = computed(() =>
  newProducts.value.slice(0, 6).filter((_, i) => i % 2 === 0)
)
const newProductsRight = computed(() =>
  newProducts.value.slice(0, 6).filter((_, i) => i % 2 === 1)
)

async function onRefresh() {
  clearCache('lark_products')
  await loadData()
}

async function loadData() {
  const [b, c, h, n, cr] = await Promise.all([
    getBanners(),
    getCategories(),
    getHotProducts(),
    getNewProducts(),
    getCreators()
  ])
  banners.value = b.data
  categories.value = c.data
  hotProducts.value = h.data
  newProducts.value = n.data
  creators.value = cr.data
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function selectCategory(id) {
  uni.setStorageSync('pendingCategory', id)
  uni.switchTab({ url: '/pages/category/category' })
}

function goCategory(id) {
  if (id === 0) {
    uni.switchTab({ url: '/pages/category/category' })
  }
}

function goCreatorList() {
  uni.navigateTo({ url: '/pages/creator-list/creator-list' })
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  headerHeight.value = (sysInfo.statusBarHeight || 0) + 120
  loadData()
})

onShow(async () => {
  clearCache('lark_products')
  await loadData()
})
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background: #faf7f2;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #faf7f2;
}

.header-content {
  padding: 20rpx 32rpx;
}

.title {
  font-size: 44rpx;
  font-weight: 700;
  color: #4a6741;
  display: block;
  margin-bottom: 24rpx;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 16rpx;
}

.search-text {
  font-size: 24rpx;
  color: #999;
}

.scroll-content {
  height: 100vh;
}

.banner-wrap {
  padding: 24rpx 32rpx;
}

.banner-swiper {
  height: 280rpx;
  border-radius: 16px;
  overflow: hidden;
}

.banner-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 48rpx;
}

.banner-title {
  font-size: 36rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 8rpx;
}

.banner-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}

.section {
  padding: 32rpx;
  padding-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #4a6741;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.category-item:active {
  opacity: 0.7;
}

.category-icon-img {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 8rpx;
}

.category-icon-text {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.category-name {
  font-size: 22rpx;
  color: #666;
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

.creators-wrap {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.footer {
  padding: 48rpx 32rpx;
  text-align: center;
}

.footer-text {
  font-size: 22rpx;
  color: #999;
}
</style>
