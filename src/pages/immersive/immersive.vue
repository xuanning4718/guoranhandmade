<template>
  <view v-if="product" class="immersive-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="swiper-container" :style="{ height: swiperHeight + 'px' }">
      <swiper
        class="vertical-swiper"
        vertical
        :current="currentIndex"
        :duration="400"
        @change="onVerticalChange"
        @animationfinish="onVerticalAnimationFinish"
      >
        <swiper-item v-for="(item, idx) in productList" :key="item.id" class="swiper-item-wrapper">
          <view class="product-view" :class="{ 'product-active': idx === currentIndex }">
            <swiper
              class="image-swiper"
              :circular="getImageList(item).length > 1"
              :autoplay="imageAutoplay"
              :interval="3000"
              @change="onImageChange(idx, $event)"
              @touchstart="stopAutoplay"
              @touchend="resumeAutoplay"
            >
              <swiper-item v-for="(img, i) in getImageList(item)" :key="i">
                <image
                  class="product-image"
                  :src="img"
                  mode="aspectFill"
                  @click="previewImage(getImageList(item), i)"
                />
              </swiper-item>
            </swiper>

            <view v-if="getImageList(item).length > 1" class="image-counter">
              <text>{{ (imageCurrentIndex[idx] || 0) + 1 }}/{{ getImageList(item).length }}</text>
            </view>

            <view class="product-mask" :style="{ background: getMaskGradient() }" />

            <view class="bottom-info">
              <view class="creator-bar" @click.stop="goCreator(item)">
                <view class="creator-avatar" :style="{ backgroundColor: getCreatorAvatarColor(item?.creatorId || 0) }">
                  <text>{{ getCreatorName(item)?.charAt(0) || '?' }}</text>
                </view>
                <text class="creator-name">{{ getCreatorName(item) }}</text>
                <view v-if="getCreatorLevel(item)" class="creator-level" :class="'level-' + getCreatorLevel(item)">{{ getCreatorLevel(item) }}</view>
              </view>
              <text class="product-title">{{ item.title }}</text>
              <view class="tags-wrap" v-if="item.tags && item.tags.length">
                <text v-for="tag in item.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</text>
              </view>
              <text v-if="item.description" class="product-desc">{{ truncate(item.description, 80) }}</text>
            </view>

            <view class="action-bar">
              <view class="action-item" @click.stop="toggleLike(item)">
                <text class="action-icon" :class="{ liked: itemLiked(item.id) }">{{ itemLiked(item.id) ? '♥' : '♡' }}</text>
                <text class="action-count">{{ item.likes || 0 }}</text>
              </view>
              <view class="action-item" @click.stop="toggleFavorite(item)">
                <text class="action-icon" :class="{ liked: favoriteStore.isProductFavorited(item.id) }">{{ favoriteStore.isProductFavorited(item.id) ? '★' : '☆' }}</text>
                <text class="action-count">收藏</text>
              </view>
              <view class="action-item" @click.stop="showCommentPanel = true">
                <text class="action-icon">💬</text>
                <text class="action-count">{{ commentCountMap[item?.id] > 0 ? commentCountMap[item?.id] : '评论' }}</text>
              </view>
              <view class="action-item" @click.stop="shareProduct(item)">
                <text class="action-icon">↗</text>
                <text class="action-count">分享</text>
              </view>
            </view>

            <view class="detail-btn-wrap">
              <view class="detail-btn" @click.stop="goDetail(item)">
                <text>详情</text>
              </view>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <CommentPanel
      :visible="showCommentPanel"
      :productId="product?.id"
      @close="showCommentPanel = false"
    />
  </view>

  <view v-else class="immersive-page immersive-loading">
    <view class="loading-wrap">
      <view class="loading-spinner" />
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSwipeContextStore } from '../../stores/swipeContext.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import { getProductById, getCreators, getComments } from '../../api/index.js'
import { convertCloudImages } from '../../utils/cloudImage.js'
import CommentPanel from '../../components/CommentPanel.vue'

const swipeContext = useSwipeContextStore()
const favoriteStore = useFavoriteStore()

const statusBarHeight = ref(0)
const swiperHeight = ref(0)
const currentIndex = ref(0)
const product = ref(null)
const commentCountMap = ref({})
const showCommentPanel = ref(false)
const imageAutoplay = ref(true)
const imageCurrentIndex = ref({})
const likedProducts = ref({})
const productCache = ref({})
const creatorCache = ref({})

const productList = computed(() => swipeContext.productList)

const isFavoritedIdx = (idx) => {
  if (idx < 0 || idx >= productList.value.length) return false
  return favoriteStore.isProductFavorited(productList.value[idx].id)
}

const itemLiked = (id) => !!likedProducts.value[id]

function getImageList(item) {
  return item && item.images ? item.images : []
}

function getCreatorName(item) {
  if (!item) return ''
  const creatorId = item.creatorId
  if (creatorCache.value[creatorId]) return creatorCache.value[creatorId].name
  if (item.creatorName) return item.creatorName
  return '未知创作者'
}

function getCreatorLevel(item) {
  if (!item) return ''
  const creatorId = item.creatorId
  if (creatorCache.value[creatorId]) return creatorCache.value[creatorId].level || '新手'
  return '新手'
}

function getCreatorAvatarColor(creatorId) {
  const colors = ['#C4A882', '#8FB58A', '#B58F9E', '#8FA8B5', '#B5A88F']
  return colors[Math.abs(creatorId || 0) % colors.length]
}

function getMaskGradient() {
  return 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)'
}

function truncate(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function onImageChange(idx, e) {
  imageCurrentIndex.value[idx] = e.detail.current
}

function onVerticalChange(e) {
  currentIndex.value = e.detail.current
}

function onVerticalAnimationFinish(e) {
  const idx = e.detail.current
  switchToProduct(idx)
}

function stopAutoplay() {
  imageAutoplay.value = false
}

function resumeAutoplay() {
  setTimeout(() => {
    imageAutoplay.value = true
  }, 5000)
}

async function switchToProduct(idx) {
  if (idx < 0 || idx >= productList.value.length) return

  if (productCache.value[idx]) {
    product.value = productCache.value[idx]
  } else {
    await loadProduct(idx)
  }
  swipeContext.currentIndex = idx

  if (!creatorCache.value[product.value?.creatorId]) {
    loadCreator(product.value?.creatorId)
  }

  if (!commentCountMap.value[product.value?.id]) {
    loadComments(product.value?.id)
  }
}

async function loadProduct(idx) {
  const item = productList.value[idx]
  if (!item) return

  try {
    if (item.id !== product.value?.id && idx !== currentIndex.value) return

    const data = productCache.value[idx] || { ...item }
    if (data.images && data.images.length > 0) {
      data.images = await convertCloudImages(data.images)
    }

    productCache.value[idx] = data

    if (productCache.value[idx] === data && idx === currentIndex.value) {
      product.value = data
    }
  } catch (err) {
    console.error('[immersive] loadProduct failed:', err)
  }
}

async function loadCreator(creatorId) {
  try {
    const res = await getCreators()
    const c = res.data.find(x => x.id === creatorId)
    if (c) {
      creatorCache.value[creatorId] = c
    }
  } catch (e) {
    console.error('[immersive] loadCreator failed:', e)
  }
}

async function loadComments(productId) {
  try {
    const res = await getComments(productId)
    commentCountMap.value[productId] = (res.data || []).length
  } catch (e) {
    console.error('[immersive] loadComments failed:', e)
  }
}

function toggleFavorite(item) {
  const added = favoriteStore.toggleProduct(item.id)
  uni.showToast({ title: added ? '已收藏' : '取消收藏', icon: 'none' })
}

function toggleLike(item) {
  likedProducts.value[item.id] = !likedProducts.value[item.id]
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/product/product?id=${item.id}` })
}

function goCreator(item) {
  if (item.creatorId) {
    uni.navigateTo({ url: `/pages/creator/creator?id=${item.creatorId}` })
  }
}

function shareProduct(item) {
  uni.showShareMenu({ withShareTicket: true })
  uni.showToast({ title: '请使用右上角分享', icon: 'none' })
}

function previewImage(images, idx) {
  uni.previewImage({ current: idx, urls: images })
}

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  swiperHeight.value = sysInfo.windowHeight - statusBarHeight.value

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const id = parseInt(currentPage.options?.id || '0')

  if (!swipeContext.enabled || swipeContext.productList.length === 0) {
    const res = await getProductById(id)
    if (res.data) {
      res.data.images = await convertCloudImages(res.data.images || [])
      swipeContext.enterSwipeMode([res.data], 0, 'direct')
      productCache.value[0] = res.data
      product.value = res.data
    }
  } else {
    const idx = swipeContext.productList.findIndex(p => p.id === id)
    if (idx !== -1) {
      currentIndex.value = idx
    }

    await switchToProduct(currentIndex.value)
  }
})

onUnmounted(() => {
})
</script>

<style scoped>
.immersive-page {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: #000;
  z-index: 9999;
}

.swiper-container {
  position: relative;
  width: 100%;
}

.vertical-swiper {
  width: 100%;
  height: 100%;
}

.swiper-item-wrapper {
  width: 100%;
  height: 100%;
}

.product-view {
  position: relative;
  width: 100%;
  height: 100%;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.product-active {
  opacity: 1;
}

.image-swiper {
  width: 100%;
  height: 100%;
}

.product-image {
  width: 100%;
  height: 100%;
}

.image-counter {
  position: absolute;
  bottom: 260rpx;
  right: 32rpx;
  background: rgba(0,0,0,0.5);
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  z-index: 10;
}

.image-counter text {
  color: #fff;
  font-size: 22rpx;
}

.product-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 500rpx;
  pointer-events: none;
  z-index: 10;
}

.bottom-info {
  position: absolute;
  left: 32rpx;
  right: 160rpx;
  bottom: 200rpx;
  z-index: 11;
}

.creator-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.creator-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.creator-avatar text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}

.creator-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  margin-right: 12rpx;
}

.creator-level {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 12rpx;
}

.level-新手 {
  background: rgba(255,255,255,0.2);
  color: #ccc;
}

.level-认证创作者 {
  background: rgba(74,143,98,0.3);
  color: #8fdb9e;
}

.level-热门创作者 {
  background: rgba(232,164,74,0.3);
  color: #ffc97a;
}

.product-title {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: block;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.tag {
  font-size: 22rpx;
  color: #fff;
  background: rgba(255,255,255,0.2);
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}

.product-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  display: block;
}

.action-bar {
  position: absolute;
  right: 24rpx;
  bottom: 240rpx;
  z-index: 11;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-icon {
  font-size: 52rpx;
  color: #fff;
  margin-bottom: 4rpx;
}

.action-icon.liked {
  color: #e64340;
}

.action-count {
  font-size: 20rpx;
  color: #fff;
}

.detail-btn-wrap {
  position: absolute;
  right: 24rpx;
  bottom: 140rpx;
  z-index: 11;
}

.detail-btn {
  background: rgba(255,255,255,0.2);
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
}

.detail-btn:active {
  background: rgba(255,255,255,0.3);
}

.detail-btn text {
  color: #fff;
  font-size: 24rpx;
}

.immersive-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-wrap text {
  color: #fff;
  font-size: 28rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
