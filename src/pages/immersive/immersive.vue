<template>
  <view v-if="productList.length > 0 && commentEnabled !== null" class="immersive-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="top-bar">
      <view class="top-left">
        <view class="back-btn" @click.stop="goBack">
          <text class="back-icon">‹</text>
        </view>
        <view class="creator-bar" @click.stop="goCreator(currentProduct)">
          <image class="creator-avatar-img" src="/static/images/guoran.jpg" mode="aspectFill" />
          <text class="creator-name">{{ currentName }}</text>
          <view v-if="currentLevel" :class="levelClass(currentLevel)">{{ currentLevel }}</view>
        </view>
      </view>
    </view>

    <view class="main-area" :style="{ height: mainHeight + 'px' }">
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
                  mode="aspectFit"
                  @click="previewImage(getImageList(item), i)"
                />
              </swiper-item>
            </swiper>

            <view v-if="getImageList(item).length > 1" class="image-counter">
              <text>{{ (imageCurrentIndex[idx] || 0) + 1 }}/{{ getImageList(item).length }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view class="bottom-bar" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="bottom-left">
        <view class="title-row">
          <text class="product-title">{{ currentProduct.title || '' }}</text>
          <view class="title-buttons">
            <view class="title-detail-btn" @click.stop="goDetail(currentProduct)">
              <text>详情</text>
              <view class="detail-arrow" />
            </view>
            <view class="title-share-btn" @click.stop="shareProduct(currentProduct)">
              <image class="share-icon-img" src="/static/images/icon-share.png" mode="aspectFit" />
            </view>
          </view>
        </view>
        <view class="tags-wrap" v-if="currentProduct.tags && currentProduct.tags.length">
          <text v-for="tag in currentProduct.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</text>
        </view>
        <scroll-view v-if="currentProduct.description" scroll-y class="desc-scroll">
          <text class="product-desc">{{ currentProduct.description }}</text>
        </scroll-view>
      </view>

      <view class="bottom-actions">
        <view class="action-btn-col">
          <view class="action-item" @click.stop="doToggleLike(currentProduct)">
            <image class="action-icon-img" :class="{ unliked: !itemLiked(currentProduct.id) }" :src="itemLiked(currentProduct.id) ? '/static/images/good-active.png' : '/static/images/good.png'" mode="aspectFit" />
            <text class="action-count">{{ currentProduct.likes ?? 0 }}</text>
          </view>
          <view class="action-item" @click.stop="doToggleFavorite(currentProduct)">
            <image class="action-icon-img" :src="favoriteStore.isProductFavorited(currentProduct.id) ? '/static/images/收藏 -已收藏.png' : '/static/images/收藏.png'" mode="aspectFit" />
            <text class="action-count">{{ currentProduct.favorites ?? 0 }}</text>
          </view>
          <view v-if="commentEnabled" class="action-item" @click.stop="showCommentPanel = true">
            <image class="action-icon-img comment-icon" src="/static/images/comment.png" mode="aspectFit" />
            <text class="action-count">{{ commentCountMap[currentProduct?.id] > 0 ? commentCountMap[currentProduct?.id] : 0 }}</text>
          </view>
        </view>

        <view class="wishlist-btn" @click.stop="addToWishlist(currentProduct)">
          <image class="wishlist-btn-icon" src="/static/images/tab-cart.png" mode="aspectFit" />
          <text class="wishlist-btn-text">加入意愿</text>
        </view>
      </view>
    </view>

    <CommentPanel
      v-if="commentEnabled"
      :visible="showCommentPanel"
      :productId="currentProduct?.id"
        @close="onCommentClose"
    />

    <SharePoster
      :visible="showSharePoster"
      :product="currentProduct"
      :creator="currentCreatorData"
      @close="showSharePoster = false"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useSwipeContextStore } from '../../stores/swipeContext.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import { useWishlistStore } from '../../stores/cart.js'
import { getProductById, getCreators, getComments, updateProductStats, getCommentEnabled } from '../../api/index.js'
import { convertCloudImages } from '../../utils/cloudImage.js'
import CommentPanel from '../../components/CommentPanel.vue'
import SharePoster from '../../components/SharePoster.vue'

const swipeContext = useSwipeContextStore()
const favoriteStore = useFavoriteStore()
const wishlistStore = useWishlistStore()

const statusBarHeight = ref(0)
const mainHeight = ref(0)
const safeBottom = ref(0)
const currentIndex = ref(0)
const commentCountMap = ref({})
const showCommentPanel = ref(false)
const commentEnabled = ref(null)
const showSharePoster = ref(false)
const imageAutoplay = ref(true)
const imageCurrentIndex = ref({})
const likedProducts = ref({})
const productCache = ref({})
const creatorCache = ref({})

const productList = computed(() => swipeContext.productList)

const currentProduct = computed(() => {
  const idx = currentIndex.value
  if (!productList.value.length || idx < 0 || idx >= productList.value.length) return {}
  return productCache.value[idx] || productList.value[idx] || {}
})

const currentName = computed(() => {
  const p = currentProduct.value
  if (!p) return '未知创作者'
  const creatorId = p.creatorId
  if (creatorCache.value[creatorId]) return creatorCache.value[creatorId].name
  if (p.creatorName) return p.creatorName
  return '未知创作者'
})

const currentLevel = computed(() => {
  const p = currentProduct.value
  if (!p) return ''
  const creatorId = p.creatorId
  if (creatorCache.value[creatorId]) return creatorCache.value[creatorId].level || ''
  return ''
})

const currentCreatorData = computed(() => {
  const p = currentProduct.value
  if (!p) return null
  const creatorId = p.creatorId
  if (creatorCache.value[creatorId]) return creatorCache.value[creatorId]
  return {
    id: creatorId,
    name: p.creatorName || '未知创作者',
    wechatQR: null
  }
})

function levelClass(level) {
  const map = { '新手': 'c-level clvl-new', '认证创作者': 'c-level clvl-cert', '热门创作者': 'c-level clvl-hot' }
  return map[level] || 'c-level clvl-new'
}

const itemLiked = (id) => !!likedProducts.value[id]

onShareAppMessage(() => {
  return {
    title: currentProduct.value?.title || '菓然手作',
    path: `/pages/immersive/immersive?id=${currentProduct.value?.id}`,
    imageUrl: currentProduct.value?.images?.[0] || '/static/images/guoran.jpg'
  }
})

onShareTimeline(() => {
  return {
    title: currentProduct.value?.title || '菓然手作',
    imageUrl: currentProduct.value?.images?.[0] || '/static/images/guoran.jpg'
  }
})

function getImageList(item) {
  return item && item.images ? item.images : []
}

function truncate(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function onImageChange(idx, e) {
  imageCurrentIndex.value[idx] = e.detail.current
}

let switchCooldown = false
let switchVersion = 0

function onVerticalChange(e) {
  if (!switchCooldown) {
    currentIndex.value = e.detail.current
  }
}

function onVerticalAnimationFinish(e) {
  if (switchCooldown) return
  switchCooldown = true
  const idx = e.detail.current
  switchToProduct(idx)
  setTimeout(() => {
    switchCooldown = false
  }, 500)
}

function stopAutoplay() {
  imageAutoplay.value = false
}

function resumeAutoplay() {
  setTimeout(() => {
    imageAutoplay.value = true
  }, 5000)
}

async function doToggleLike(item) {
  if (!item?.id) return
  const wasLiked = itemLiked(item.id)
  likedProducts.value[item.id] = !wasLiked
  const newLiked = itemLiked(item.id)

  if (productCache.value[currentIndex.value]?.id === item.id) {
    productCache.value[currentIndex.value] = {
      ...productCache.value[currentIndex.value],
      likes: (productCache.value[currentIndex.value].likes ?? 0) + (newLiked ? 1 : -1)
    }
    productCache.value = { ...productCache.value }
  }

  try {
    await updateProductStats(item.id, { likes: productCache.value[currentIndex.value]?.likes ?? 0 })
  } catch (e) {
    console.error('[immersive] sync likes failed:', e)
    likedProducts.value[item.id] = wasLiked
    if (productCache.value[currentIndex.value]?.id === item.id) {
      productCache.value[currentIndex.value] = {
        ...productCache.value[currentIndex.value],
        likes: (productCache.value[currentIndex.value].likes ?? 0) + (newLiked ? -1 : 1)
      }
      productCache.value = { ...productCache.value }
    }
  }
}

async function doToggleFavorite(item) {
  if (!item?.id) return
  const wasFavorited = favoriteStore.isProductFavorited(item.id)
  const added = favoriteStore.toggleProduct(item.id)

  const currentFavorites = (productCache.value[currentIndex.value]?.favorites ?? 0)
  if (productCache.value[currentIndex.value]?.id === item.id) {
    productCache.value[currentIndex.value] = {
      ...productCache.value[currentIndex.value],
      favorites: currentFavorites + (added ? 1 : -1)
    }
    productCache.value = { ...productCache.value }
  }

  try {
    await updateProductStats(item.id, { favorites: productCache.value[currentIndex.value]?.favorites ?? 0 })
  } catch (e) {
    console.error('[immersive] sync favorites failed:', e)
    favoriteStore.toggleProduct(item.id)
    if (productCache.value[currentIndex.value]?.id === item.id) {
      productCache.value[currentIndex.value] = {
        ...productCache.value[currentIndex.value],
        favorites: (productCache.value[currentIndex.value].favorites ?? 0) + (added ? -1 : 1)
      }
      productCache.value = { ...productCache.value }
    }
  }

  uni.showToast({ title: added ? '已收藏' : '取消收藏', icon: 'none' })
}

function goBack() {
  uni.navigateBack()
}

async function switchToProduct(idx) {
  const version = ++switchVersion
  if (idx < 0 || idx >= productList.value.length) return

  showCommentPanel.value = false
  imageCurrentIndex.value = {}
  imageAutoplay.value = true

  if (!productCache.value[idx]) {
    await loadProduct(idx)
  }

  if (version !== switchVersion) return

  currentIndex.value = idx
  swipeContext.currentIndex = idx

  const p = currentProduct.value
  if (p?.creatorId && !creatorCache.value[p.creatorId]) {
    loadCreator(p.creatorId)
  }
  if (p?.id && !commentCountMap.value[p.id]) {
    loadComments(p.id)
  }
}

async function loadProduct(idx) {
  const item = productList.value[idx]
  if (!item) return

  try {
    const data = { ...item }

    if (data.images && data.images.length > 0 && !data.images[0].startsWith('http')) {
      data.images = await convertCloudImages(data.images)
    }

    productCache.value[idx] = data
    productCache.value = { ...productCache.value }
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
  if (!commentEnabled.value) return
  try {
    const res = await getComments(productId)
    if (res.data && Array.isArray(res.data)) {
      commentCountMap.value[productId] = res.data.filter(c => {
        const pid = typeof c.parentId === 'string' ? parseInt(c.parentId) : c.parentId
        return !pid || pid === 0
      }).length
    }
  } catch (e) {
    console.error('[immersive] loadComments failed:', e)
  }
}

function goDetail(item) {
  if (!item?.id) return
  uni.navigateTo({ url: `/pages/product/product?id=${item.id}` })
}

function goCreator(item) {
  if (item?.creatorId) {
    uni.navigateTo({ url: `/pages/creator/creator?id=${item.creatorId}` })
  }
}

function shareProduct(item) {
  if (!item?.id) return
  showSharePoster.value = true
}

async function onCommentClose() {
  showCommentPanel.value = false
  const pid = currentProduct.value?.id
  if (pid) {
    await loadComments(pid)
  }
}

function addToWishlist(item) {
  if (!item) return
  wishlistStore.addItem({
    productId: item.id,
    title: item.title,
    images: item.images,
    tags: item.tags,
    addedAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  })
  uni.showToast({ title: '已加入意愿', icon: 'success' })
}

function previewImage(images, idx) {
  uni.previewImage({ current: idx, urls: images })
}

onMounted(async () => {
  console.log('[immersive] onMounted')
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  safeBottom.value = (sysInfo.safeArea && sysInfo.safeArea.bottom) ? (sysInfo.windowHeight - sysInfo.safeArea.bottom) : 0

  const topBarH = (sysInfo.statusBarHeight || 0) + 48
  const bottomBarH = 280
  mainHeight.value = sysInfo.windowHeight - topBarH - bottomBarH - statusBarHeight.value

  const commentRes = await getCommentEnabled()
  commentEnabled.value = commentRes.data

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const id = parseInt(currentPage.options?.id || '0')
  console.log('[immersive] page id:', id, 'context enabled:', swipeContext.enabled, 'list len:', swipeContext.productList.length)

  if (!swipeContext.enabled || swipeContext.productList.length === 0) {
    console.log('[immersive] fallback: direct load via getProductById')
    const res = await getProductById(id)
    if (res.data) {
      res.data.images = await convertCloudImages(res.data.images || [])
      swipeContext.enterSwipeMode([res.data], 0, 'direct')
      productCache.value[0] = res.data
    }
  } else {
    const idx = swipeContext.productList.findIndex(p => p.id === id)
    console.log('[immersive] using context, found index:', idx)
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
  display: flex;
  flex-direction: column;
}

.top-bar {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8rpx 12rpx;
  z-index: 10;
}

.top-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.back-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-icon {
  font-size: 48rpx;
  color: #fff;
  font-weight: 300;
  line-height: 1;
}

.creator-bar {
  display: flex;
  align-items: center;
  margin-left: 4rpx;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.creator-avatar-img {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.creator-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8rpx;
}

.c-level {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.clvl-new {
  background: rgba(255,255,255,0.18);
  color: #ccc;
}

.clvl-cert {
  background: rgba(74,143,98,0.25);
  color: #8fdb9e;
}

.clvl-hot {
  background: rgba(232,164,74,0.25);
  color: #ffc97a;
}

.main-area {
  flex: 1;
  min-height: 0;
  position: relative;
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
  bottom: 24rpx;
  right: 24rpx;
  background: rgba(0,0,0,0.6);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  z-index: 10;
}

.image-counter text {
  color: #fff;
  font-size: 20rpx;
}

.bottom-bar {
  background: #000;
  padding: 16rpx 24rpx;
  position: relative;
  z-index: 10;
}

.bottom-left {
  margin-bottom: 4rpx;
  padding-right: 24rpx;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rpx;
}

.product-title {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.5;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.title-buttons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8rpx;
  padding-right: 4rpx;
}

.title-share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}

.share-icon-img {
  width: 42rpx;
  height: 42rpx;
}

.title-detail-btn {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: rgba(232,164,74,0.18);
  padding: 8rpx 20rpx 8rpx 28rpx;
  border-radius: 20rpx;
}

.detail-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 4rpx solid #e8a44a;
  border-right: 4rpx solid #e8a44a;
  transform: rotate(45deg);
  margin-left: 12rpx;
  margin-right: 4rpx;
}

.title-detail-btn:active {
  background: rgba(232,164,74,0.3);
}

.title-detail-btn text {
  color: #e8a44a;
  font-size: 32rpx;
  font-weight: 600;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 2rpx;
}

.tag {
  font-size: 22rpx;
  color: #fff;
  background: rgba(255,255,255,0.15);
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
}

.desc-scroll {
  max-height: 124rpx;
}

.product-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
  line-height: 1.5;
  display: block;
}

.bottom-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-left: 4rpx;
  padding-right: 12rpx;
}

.action-btn-col {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
  gap: 80rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-icon-img {
  width: 52rpx;
  height: 52rpx;
  margin-bottom: 4rpx;
}

.action-icon-img.unliked {
  filter: brightness(0) invert(1) opacity(0.85);
}

.action-icon-img.comment-icon {
  filter: brightness(0) invert(1);
}

.wishlist-btn {
  flex-shrink: 0;
  width: 50%;
  background: #4a6741;
  border-radius: 44rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-left: 8rpx;
}

.wishlist-btn:active {
  opacity: 0.85;
}

.wishlist-btn-icon {
  width: 36rpx;
  height: 36rpx;
}

.wishlist-btn-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}

.action-count {
  font-size: 20rpx;
  color: #fff;
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
