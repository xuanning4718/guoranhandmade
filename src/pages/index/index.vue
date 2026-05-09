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
          <swiper-item v-for="banner in banners" :key="banner.id" @click="handleBannerClick(banner)">
            <view class="banner-item">
              <image
                v-if="banner.image"
                class="banner-image"
                :src="banner.image"
                mode="aspectFill"
              />
              <view v-else class="banner-gradient" :style="{ background: banner.background || bannerGradients[(banner.id - 1) % bannerGradients.length] }" />
              <view v-if="banner.title || banner.subtitle" class="banner-overlay">
                <text class="banner-title">{{ banner.title }}</text>
                <text class="banner-subtitle">{{ banner.subtitle }}</text>
              </view>
            </view>
          </swiper-item>
        </swiper>
      </view>

      <view class="section category-section">
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
              v-for="product in hotProductsLeft"
              :key="product.id"
              :product="product"
              :swipeList="hotProducts"
              :swipeIndex="hotProducts.indexOf(product)"
              sourcePage="index-hot"
            />
          </view>
          <view class="product-column">
            <ProductCard
              v-for="product in hotProductsRight"
              :key="product.id"
              :product="product"
              :swipeList="hotProducts"
              :swipeIndex="hotProducts.indexOf(product)"
              sourcePage="index-hot"
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
              v-for="product in newProductsLeft"
              :key="product.id"
              :product="product"
              :swipeList="newProducts"
              :swipeIndex="newProducts.indexOf(product)"
              sourcePage="index-new"
            />
          </view>
          <view class="product-column">
            <ProductCard
              v-for="product in newProductsRight"
              :key="product.id"
              :product="product"
              :swipeList="newProducts"
              :swipeIndex="newProducts.indexOf(product)"
              sourcePage="index-new"
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
import { useSwipeContextStore } from '../../stores/swipeContext.js'

const statusBarHeight = ref(0)
const headerHeight = ref(0)
const banners = ref([])
const categories = ref([])
const hotProducts = ref([])
const newProducts = ref([])
const creators = ref([])

const swipeContext = useSwipeContextStore()

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
  'linear-gradient(135deg, #E8D4E5 0%, #D4B8D0 100%)',
  'linear-gradient(135deg, #C4D4E8 0%, #A8B8D5 100%)',
  'linear-gradient(135deg, #E8E0D4 0%, #D5C8B8 100%)',
  'linear-gradient(135deg, #D4E8D8 0%, #B8D5C0 100%)'
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

function handleBannerClick(banner) {
  if (!banner.linkType || banner.linkType === '纯展示') return

  switch (banner.linkType) {
    case '分类':
      if (banner.linkValue) {
        uni.setStorageSync('pendingCategory', parseInt(banner.linkValue))
        uni.switchTab({ url: '/pages/category/category' })
      }
      break
    case '作品':
      if (banner.linkValue) {
        const id = parseInt(banner.linkValue)
        if (!isNaN(id)) {
          const allItems = [...hotProducts.value]
          const product = allItems.find(p => p.id === id)
          if (product) {
            swipeContext.enterSwipeMode(allItems, allItems.indexOf(product), 'banner')
          } else {
            swipeContext.enterSwipeMode([product || { id }], 0, 'banner-single')
          }
          uni.navigateTo({ url: `/pages/immersive/immersive?id=${id}` })
        }
      }
      break
    case '作者':
      if (banner.linkValue) {
        const id = parseInt(banner.linkValue)
        if (!isNaN(id)) {
          uni.navigateTo({ url: `/pages/creator/creator?id=${id}` })
        }
      }
      break
    case '链接':
      if (banner.linkValue) {
        uni.setClipboardData({
          data: banner.linkValue,
          success: () => {
            uni.showToast({ title: '链接已复制', icon: 'success' })
          }
        })
      }
      break
  }
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
    headerHeight.value = (sysInfo.statusBarHeight || 0) + 100
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
  padding: 12rpx 32rpx;
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
  padding: 8rpx 32rpx 0;
}

.banner-swiper {
  height: 300rpx;
  border-radius: 16px;
  overflow: hidden;
}

.banner-item {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-gradient {
  width: 100%;
  height: 100%;
}

.banner-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
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
  padding: 40rpx 32rpx;
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

.category-section {
  padding-top: 24rpx;
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
