<template>
  <view class="creator-page">
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="error" class="error-state">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ error }}</text>
      <button class="retry-btn" @click="loadData">重试</button>
    </view>

    <view v-else-if="!creator" class="empty-state">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">未找到创作者</text>
      <button class="back-btn" @click="goBack">返回</button>
    </view>

    <scroll-view v-else scroll-y class="scroll-content" @scrolltolower="loadMore" :lower-threshold="100">
      <view class="cover-section" :style="{ background: coverGradient }">
        <view class="creator-avatar" :style="{ backgroundColor: avatarColor }">
          <text class="avatar-text">{{ creator.name.charAt(0) }}</text>
        </view>
        <view class="creator-info">
          <text class="creator-name">{{ creator.name }}</text>
          <view class="level-badge" :class="levelClass">
            <text>{{ creator.level }}</text>
          </view>
          <text class="creator-bio">{{ creator.bio }}</text>
          <view v-if="creator.location" class="creator-location">
            <text class="location-icon">📍</text>
            <text class="location-text">{{ creator.location }}</text>
          </view>
        </view>
      </view>

      <view class="stats-section">
        <view class="stat-item">
          <text class="stat-num">{{ creator.worksCount }}</text>
          <text class="stat-label">作品</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ creator.followers }}</text>
          <text class="stat-label">粉丝</text>
        </view>
      </view>

      <view class="action-section">
        <button
          class="follow-btn"
          :class="{ followed: isFollowed }"
          @click="toggleFollow"
        >
          {{ isFollowed ? '已关注' : '+ 关注' }}
        </button>
        <button v-if="creator.wechatQR" class="contact-btn" @click="showQR">
          <text class="contact-icon">💬</text>
          <text>联系TA</text>
        </button>
      </view>

      <view class="works-section">
        <view class="section-header">
          <text class="section-title">全部作品</text>
        </view>
        <view class="product-grid">
          <view class="product-column">
            <ProductCard
              v-for="product in worksLeft"
              :key="product.id"
              :product="product"
            />
          </view>
          <view class="product-column">
            <ProductCard
              v-for="product in worksRight"
              :key="product.id"
              :product="product"
            />
          </view>
        </view>
        <view v-if="works.length === 0 && !isLoadingMore" class="empty-works">
          <text class="empty-text">暂无作品</text>
        </view>
        <view v-if="isLoadingMore" class="load-more">
          <text class="loading-text">加载中...</text>
        </view>
        <view v-if="!hasMore && works.length > 0" class="load-more">
          <text>没有更多了</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="showQRModal && creator" class="qr-mask" @click="closeQR">
      <view class="qr-panel" @click.stop>
        <image class="qr-image" :src="creator.wechatQR" mode="aspectFit" />
        <text class="qr-hint">长按保存图片</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ProductCard from '../../components/ProductCard.vue'
import { useFavoriteStore } from '../../stores/favorite.js'
import { getCreatorById, getProducts } from '../../api/index.js'

const favoriteStore = useFavoriteStore()

const creator = ref(null)
const works = ref([])
const creatorId = ref(0)
const showQRModal = ref(false)
const loading = ref(false)
const error = ref('')
const currentPage = ref(1)
const hasMore = ref(true)
const isLoadingMore = ref(false)

const isFollowed = computed(() => favoriteStore.isCreatorFavorited(creatorId.value))

const avatarColors = ['#C4A882', '#8FB58A', '#B58F9E', '#8FA8B5', '#B5A88F']
const avatarColor = computed(() => {
  const id = creator.value?.id || 0
  return avatarColors[id % avatarColors.length]
})

const coverGradient = 'linear-gradient(135deg, #E8D5BC 0%, #D5C4A8 50%, #C4A882 100%)'

const levelClass = computed(() => {
  const map = {
    '新手': 'level-new',
    '认证创作者': 'level-cert',
    '热门创作者': 'level-hot'
  }
  return map[creator.value?.level] || 'level-new'
})

const worksLeft = computed(() =>
  works.value.filter((_, i) => i % 2 === 0)
)

const worksRight = computed(() =>
  works.value.filter((_, i) => i % 2 === 1)
)

const totalSales = computed(() =>
  works.value.reduce((sum, w) => sum + (w.sales || 0), 0)
)

function toggleFollow() {
  const added = favoriteStore.toggleCreator(creatorId.value)
  uni.showToast({
    title: added ? '关注成功' : '已取消关注',
    icon: 'none'
  })

  if (creator.value) {
    if (added) {
      creator.value.followers += 1
    } else {
      creator.value.followers = Math.max(0, creator.value.followers - 1)
    }
  }
}

function showQR() {
  if (creator.value?.wechatQR) {
    uni.previewImage({
      urls: [creator.value.wechatQR],
      showmenu: true
    })
  }
}

function closeQR() {
  showQRModal.value = false
}

function goBack() {
  uni.navigateBack()
}

async function loadCreator() {
  if (!creatorId.value) {
    error.value = '缺少创作者ID'
    return
  }

  loading.value = true
  error.value = ''
  
  try {
    const creatorRes = await getCreatorById(creatorId.value)
    creator.value = creatorRes.data

    if (!creator.value) {
      error.value = '未找到该创作者'
    }
  } catch (e) {
    error.value = '加载失败，请重试'
    console.error('Failed to load creator:', e)
  } finally {
    loading.value = false
  }
}

async function loadWorks(isLoadMore = false) {
  if (isLoadingMore.value || !hasMore.value) return
  
  isLoadingMore.value = true
  
  try {
    const productsRes = await getProducts({
      creatorId: creatorId.value,
      page: currentPage.value,
      pageSize: 12
    })

    if (productsRes.data.length < 12) {
      hasMore.value = false
    }

    works.value = [...works.value, ...productsRes.data]
    currentPage.value++
  } catch (e) {
    console.error('Failed to load works:', e)
  } finally {
    isLoadingMore.value = false
  }
}

async function loadData() {
  await loadCreator()
  if (creator.value) {
    await loadWorks()
  }
}

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return
  await loadWorks(true)
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const idParam = currentPage.options?.id
  
  if (idParam) {
    creatorId.value = parseInt(idParam)
    loadData()
  } else {
    error.value = '缺少创作者ID'
  }
})
</script>

<style scoped>
.creator-page {
  min-height: 100vh;
  background: #faf7f2;
}

.scroll-content {
  height: 100vh;
}

.cover-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  min-height: 200rpx;
}

.creator-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 48rpx;
  color: #fff;
  font-weight: 600;
}

.creator-info {
  flex: 1;
  min-width: 0;
  max-width: 50%;
  text-align: right;
}

.creator-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.level-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
  display: inline-block;
  margin-bottom: 4rpx;
  background: rgba(255, 255, 255, 0.9);
}

.level-badge.level-new {
  color: #999;
}

.level-badge.level-cert {
  color: #4a8f62;
}

.level-badge.level-hot {
  color: #e8a44a;
}

.creator-bio {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-location {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
}

.location-icon {
  font-size: 24rpx;
}

.location-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}

.stats-section {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #fff;
  margin: 24rpx 32rpx;
  padding: 32rpx 0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-num {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: #f0ebe3;
}

.action-section {
  display: flex;
  gap: 24rpx;
  padding: 0 32rpx;
  margin-bottom: 32rpx;
}

.follow-btn {
  flex: 1;
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  border: none;
}

.follow-btn::after {
  border: none;
}

.follow-btn.followed {
  background: #f0ebe3;
  color: #666;
}

.contact-btn {
  width: 160rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #faf7f2;
  color: #4a6741;
  border-radius: 40rpx;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
}

.contact-btn::after {
  border: none;
}

.contact-btn:active {
  opacity: 0.7;
}

.contact-icon {
  font-size: 28rpx;
  margin-right: 4rpx;
}

.works-section {
  padding: 0 32rpx 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.works-count {
  font-size: 24rpx;
  color: #999;
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

.load-more {
  text-align: center;
  padding: 32rpx;
  font-size: 24rpx;
  color: #999;
}

.empty-works {
  text-align: center;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 24rpx;
  color: #999;
}

.qr-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-panel {
  background: #fff;
  border-radius: 16px;
  padding: 32rpx;
  max-width: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-image {
  width: 400rpx;
  height: 400rpx;
  border-radius: 8px;
}

.qr-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 64rpx 32rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.error-icon,
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.error-text,
.empty-text {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}

.retry-btn,
.back-btn {
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  padding: 16rpx 48rpx;
  font-size: 28rpx;
  border: none;
}

.retry-btn::after,
.back-btn::after {
  border: none;
}
</style>
