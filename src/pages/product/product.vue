<template>
  <view v-if="product" class="product-page">
    <scroll-view scroll-y class="scroll-content">
      <view class="image-section">
        <swiper
          class="image-swiper"
          circular
          indicator-dots
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#fff"
          @change="onImageChange"
        >
          <swiper-item v-for="(img, idx) in product.images" :key="idx">
            <image
              :class="['product-image', { 'image-failed': imgFailed[idx] }]"
              :src="img"
              mode="aspectFit"
              @error="imgFailed[idx] = true"
            />
            <view v-if="imgFailed[idx]" class="image-placeholder" :style="{ background: placeholderColors[idx % placeholderColors.length] }">
              <text class="placeholder-icon">🖼️</text>
            </view>
          </swiper-item>
        </swiper>
        <view v-if="product.images.length > 1" class="image-badge">
          <text class="badge-text">{{ currentImage + 1 }}/{{ product.images.length }}</text>
        </view>
      </view>

      <view class="info-section">
        <text class="product-title">{{ product.title }}</text>
        <view class="tags-wrap">
          <text v-for="tag in product.tags || []" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>

      <view v-if="creator" class="creator-section">
        <view class="creator-left" @click="goCreator">
          <view class="creator-avatar" :style="{ backgroundColor: creatorAvatarColor }">
            <text class="avatar-text">{{ creator.name?.charAt(0) || '?' }}</text>
          </view>
          <view class="creator-info">
            <view class="creator-name-row">
              <text class="creator-name">{{ creator.name }}</text>
              <view class="level-tag" :class="creatorLevelClass">
                <text>{{ creator.level }}</text>
              </view>
            </view>
            <text class="creator-bio">{{ creator.bio }}</text>
          </view>
        </view>
        <view class="creator-actions">
          <view class="contact-btn" @click="contactCreator">
            <image class="contact-icon-img" src="/static/images/icon-contact.png" mode="aspectFit" />
            <text class="contact-text">联系</text>
          </view>
        </view>
      </view>

      <view class="detail-section">
        <text class="section-title">作品详情</text>
        <text class="product-description">{{ product.description }}</text>
        <view v-if="product.createdAt" class="created-time">
          <text class="time-label">上架时间</text>
          <text class="time-value">{{ formatDate(product.createdAt) }}</text>
        </view>
        <view v-if="product.images.length > 0" class="detail-images">
          <image
            v-for="(img, idx) in product.images"
            :key="idx"
            class="detail-image"
            :src="img"
            mode="widthFix"
            @click="previewImage(img)"
          />
        </view>
      </view>

      <view class="comment-section">
        <view class="section-header">
          <text class="section-title">评价</text>
          <text class="comment-count">({{ comments.length }})</text>
        </view>

        <view v-if="comments.length > 0" class="comment-list">
          <view v-for="rootComment in rootComments" :key="rootComment.id" class="comment-item">
            <view class="comment-main">
              <view class="comment-meta">
                <text class="comment-user">{{ rootComment.userName }}</text>
                <view class="comment-stars">
                  <text
                    v-for="s in [1,2,3,4,5]"
                    :key="s"
                    class="star"
                    :class="{ filled: s <= rootComment.score }"
                  >★</text>
                </view>
              </view>
              <text class="comment-content">{{ rootComment.content }}</text>
            </view>
            <view class="comment-footer">
              <view class="reply-trigger" @click="openReply(rootComment.id)">
                <image class="footer-icon" src="/static/images/comment.png" mode="aspectFit" />
                <text class="reply-text">回复</text>
              </view>
              <view class="like-trigger" @click="toggleLike(rootComment.id)">
                <text v-if="likedComments[rootComment.id]" class="like-count">{{ (rootComment.likes || 0) + 1 }}</text>
                <text v-else class="like-count">{{ rootComment.likes > 0 ? rootComment.likes : '' }}</text>
                <image class="footer-icon" :src="likedComments[rootComment.id] ? '/static/images/good-active.png' : '/static/images/good.png'" mode="aspectFit" />
              </view>
            </view>
            <view v-if="replies[rootComment.id]?.length > 0" class="reply-list">
              <view class="reply-count" @click="toggleReplies(rootComment.id)">
                <text>{{ replies[rootComment.id].length }} 条回复</text>
              </view>
              <view v-if="expandReplies[rootComment.id]" class="reply-items">
                <view v-for="reply in replies[rootComment.id]" :key="reply.id" class="reply-item">
                  <text class="reply-user">{{ reply.userName }}:</text>
                  <text class="reply-content">{{ reply.content }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-comments">
          <text class="empty-icon">💬</text>
          <text class="empty-text">暂无评价</text>
          <button class="add-comment-btn" @click="openComment">写评价</button>
        </view>
      </view>
    </scroll-view>

      <view class="action-bar">
        <view class="action-item" @click="toggleFavorite">
          <text v-if="isFavorited" class="icon-text active">♥</text>
          <text v-else class="icon-text">♡</text>
          <text class="action-text">收藏</text>
        </view>
        <view class="action-item" @click="goWishlist">
          <view class="icon-wrap">
            <image class="action-icon-img" :class="{ 'icon-active': wishlistCount > 0 }" src="/static/images/tab-cart.png" mode="aspectFit" />
            <view v-if="wishlistCount > 0" class="badge">
              <text class="badge-text">{{ wishlistCount }}</text>
            </view>
          </view>
          <text class="action-text" :class="{ 'text-active': wishlistCount > 0 }">意愿</text>
        </view>
        <button class="action-btn" @click="addToWishlist">加入意愿</button>
        <button class="action-btn" @click="contactCreator">立即联系</button>
      </view>

    <!-- Comment modal -->
    <view v-if="showComment" class="form-mask" @tap="closeComment">
      <view class="form-panel" catchtap>
        <view class="form-header">
          <text class="form-title">写评价</text>
          <view class="form-close" @click="closeComment">
            <text>✕</text>
          </view>
        </view>
        <view class="form-body">
          <view v-if="replyingTo" class="replying-hint">
            <text>回复 {{ replyingUserName }}</text>
          </view>
          <view class="form-group">
            <textarea
              class="comment-input"
              placeholder="说说你对这件作品的感受..."
              @input="onCommentInput"
              :value="commentText"
              maxlength="200"
            />
            <text class="char-count">{{ commentText.length }}/200</text>
          </view>
          <button class="submit-btn" @click="submitComment">发布</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '../../stores/cart.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import { getProductById, getCreators, getComments, addComment } from '../../api/index.js'
import { getUserInfo } from '../../services/auth.js'
import { mockData } from '../../api/mockData.js'

const wishlistStore = useWishlistStore()
const favoriteStore = useFavoriteStore()

const product = ref(null)
const creator = ref(null)
const productId = ref(0)
const currentImage = ref(0)
const imgFailed = ref({})
const comments = ref([])
const showComment = ref(false)
const commentText = ref('')
const replyingTo = ref(null)
const replyingUserName = ref('')
const commentScore = ref(null)
const showAllComments = ref(false)
const expandReplies = ref({})
const userName = ref('')
const likedComments = ref({})

const placeholderColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

const rootComments = computed(() => comments.value.filter(c => !c.parentId || c.parentId === 0))
const replies = computed(() => {
  const map = {}
  comments.value.forEach(c => {
    if (c.parentId && c.parentId > 0) {
      if (!map[c.parentId]) map[c.parentId] = []
      map[c.parentId].push(c)
    }
  })
  return map
})

const isFavorited = computed(() => favoriteStore.isProductFavorited(productId.value))
const isInWishlist = computed(() => wishlistStore.isInWishlist(productId.value))
const wishlistCount = computed(() => wishlistStore.totalCount)

function toggleLike(commentId) {
  likedComments.value = {
    ...likedComments.value,
    [commentId]: !likedComments.value[commentId]
  }
}

const category = computed(() => {
  if (!product.value) return null
  return mockData.categories.find(c => c.id === product.value.category) || null
})

const posterGradient = computed(() => {
  if (category.value) {
    const baseColor = category.value.color
    return `linear-gradient(135deg, ${baseColor} 0%, ${adjustColor(baseColor, -15)} 100%)`
  }
  return 'linear-gradient(135deg, #E8D5BC 0%, #D5C4A8 100%)'
})

const creatorLevelClass = computed(() => {
  const map = {
    '新手': 'level-new',
    '认证创作者': 'level-cert',
    '热门创作者': 'level-hot'
  }
  return map[creator.value?.level] || 'level-new'
})

const creatorAvatarColor = computed(() => {
  const colors = ['#C4A882', '#8FB58A', '#B58F9E', '#8FA8B5', '#B5A88F']
  return colors[(creator.value?.id || 0) % colors.length]
})

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount))
  const b = Math.min(255, Math.max(0, (num & 255) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function creatorAvatarColorById(id) {
  return placeholderColors[Math.abs(id) % placeholderColors.length]
}

function getUserName(id) {
  const c = comments.value.find(c => c.id === id)
  return c ? c.userName : ''
}

function onImageChange(e) {
  currentImage.value = e.detail.current
}

async function loadData() {
  try {
    const productRes = await getProductById(productId.value)
    product.value = productRes.data
    creator.value = productRes.creator

    const commentData = await getComments(productId.value)
    if (commentData.data) {
      comments.value = commentData.data
    }

    if (product.value) {
      const creatorsRes = await getCreators()
      creator.value = creatorsRes.data.find(c => c.id === product.value.creatorId) || creator.value
    }
  } catch (err) {
    console.error('[product] Failed to load:', err)
  }
}

function toggleAllComments() {
  showAllComments.value = !showAllComments.value
}

function openReply(commentId) {
  const comment = comments.value.find(c => c.id === commentId)
  replyingTo.value = commentId
  replyingUserName.value = comment?.userName || ''
  showComment.value = true
  commentText.value = ''
}

function toggleReplies(commentId) {
  expandReplies.value = {
    ...expandReplies.value,
    [commentId]: !expandReplies.value[commentId]
  }
}

function setRating(stars) {
  commentScore.value = stars
}

function submitRating() {
  if (!commentScore.value || commentScore.value.length === 0) {
    uni.showToast({ title: '请选择评分', icon: 'none' })
    return
  }
  const avg = Math.round(commentScore.value.reduce((a, b) => a + b, 0) / commentScore.value.length)
  commentScore.value = {
    stars: Array(avg).fill('⭐'),
    text: ['','⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'][avg] || ''
  }
}

function openComment() {
  replyingTo.value = null
  showComment.value = true
  commentText.value = ''
  userName.value = getUserInfo().nickName || '匿名用户'
}

function onCommentInput(e) {
  commentText.value = e.detail.value
}

function closeComment() {
  showComment.value = false
}

async function submitComment() {
  if (!commentText.value.trim()) {
    uni.showToast({ title: '请输入评价内容', icon: 'none' })
    return
  }

  const comment = {
    id: Date.now(),
    productId: productId.value,
    parentId: replyingTo.value,
    userName: getUserInfo().nickName || '匿名用户',
    content: commentText.value,
    score: commentScore.value ? commentScore.value.stars.length : 5,
    avatar: '',
    createdAt: new Date().toISOString()
  }

  comments.value.push(comment)
  commentText.value = ''
  showComment.value = false
  replyingTo.value = null

  uni.showToast({ title: '发布成功', icon: 'success' })
}

function previewImage(url) {
  uni.previewImage({ urls: [url] })
}

function formatDate(value) {
  if (!value) return ''
  const ts = typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value) : value
  const date = typeof ts === 'number' && ts > 1e10 ? new Date(ts) : new Date(ts)
  if (isNaN(date.getTime())) return String(value)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addToWishlist() {
  if (!product.value) return
  wishlistStore.addItem({
    productId: product.value.id,
    title: product.value.title,
    tags: product.value.tags,
    addedAt: new Date().toLocaleDateString('zh-CN')
  })
  uni.showToast({ title: '已加入意愿', icon: 'success' })
}

function goWishlist() {
  uni.switchTab({ url: '/pages/cart/cart' })
}

function toggleFavorite() {
  if (!product.value) return
  const added = favoriteStore.toggleProduct(product.value.id)
  uni.showToast({
    title: added ? '已收藏' : '已取消收藏',
    icon: 'none'
  })
}

function goCreator() {
  if (!creator.value) return
  uni.navigateTo({
    url: `/pages/creator/creator?id=${creator.value.id}`
  })
}

function contactCreator() {
  if (creator.value?.wechatQR) {
    uni.previewImage({
      urls: [creator.value.wechatQR],
      showmenu: true
    })
  } else {
    uni.showToast({ title: '暂无联系方式', icon: 'none' })
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  productId.value = parseInt(currentPage.options?.id || '0')
  loadData()
})
</script>

<style scoped>
.product-page {
  min-height: 100vh;
  background: #faf7f2;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.scroll-content {
  height: calc(100vh - 160rpx - env(safe-area-inset-bottom));
}

.image-section {
  position: relative;
  width: 100%;
}

.image-swiper {
  width: 100%;
  height: 750rpx;
  background: #f5f5f5;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-image.image-failed {
  display: none;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 120rpx;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
}

.image-badge {
  position: absolute;
  bottom: 24rpx;
  left: 24rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.badge-text {
  color: #fff;
}

.info-section {
  background: #fff;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.product-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
  display: block;
  margin-bottom: 24rpx;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag {
  font-size: 22rpx;
  color: #4a6741;
  background: rgba(74, 103, 65, 0.08);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.creator-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.creator-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.creator-left:active {
  opacity: 0.8;
}

.creator-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}

.creator-info {
  flex: 1;
  min-width: 0;
}

.creator-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}

.creator-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-right: 16rpx;
}

.level-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 12rpx;
}

.level-tag.level-new {
  background: #f0f0f0;
  color: #999;
}

.level-tag.level-cert {
  background: rgba(74, 143, 98, 0.1);
  color: #4a8f62;
}

.level-tag.level-hot {
  background: rgba(232, 164, 74, 0.1);
  color: #e8a44a;
}

.creator-bio {
  font-size: 22rpx;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.creator-actions {
  display: flex;
  gap: 16rpx;
}

.contact-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  background: #faf7f2;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #4a6741;
}

.contact-btn:active {
  opacity: 0.7;
}

.contact-icon-img {
  width: 28rpx;
  height: 28rpx;
}

.contact-text {
  font-size: 22rpx;
  color: #4a6741;
}

.detail-section {
  background: #fff;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
}

.product-description {
  font-size: 24rpx;
  color: #666;
  line-height: 1.8;
  display: block;
  margin-bottom: 24rpx;
}

.created-time {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  margin-bottom: 24rpx;
  border-top: 1rpx solid #f0ebe3;
  border-bottom: 1rpx solid #f0ebe3;
}

.time-label {
  font-size: 22rpx;
  color: #999;
  margin-right: 16rpx;
}

.time-value {
  font-size: 22rpx;
  color: #666;
}

.detail-images {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-image {
  width: 100%;
  border-radius: 8px;
  background: #faf7f2;
}

.detail-image:active {
  opacity: 0.8;
}

.comment-section {
  background: #fff;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.comment-count {
  font-size: 24rpx;
  color: #999;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.comment-item {
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0ebe3;
}

.comment-meta {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.comment-user {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
  margin-right: 16rpx;
}

.comment-stars {
  display: flex;
}

.comment-stars .star {
  font-size: 20rpx;
  color: #ddd;
  margin-right: 2rpx;
}

.comment-stars .star.filled {
  color: #f5a623;
}

.comment-content {
  font-size: 24rpx;
  color: #333;
  line-height: 1.6;
  display: block;
  margin-bottom: 12rpx;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reply-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #4a6741;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.reply-trigger:active {
  opacity: 0.7;
}

.reply-text {
  color: #4a6741;
}

.like-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.like-trigger:active {
  opacity: 0.7;
}

.like-count {
  font-size: 22rpx;
  color: #999;
  min-width: 20rpx;
  text-align: right;
}

.footer-icon {
  width: 32rpx;
  height: 32rpx;
}

.reply-list {
  margin-top: 16rpx;
  padding-left: 24rpx;
}

.reply-count {
  padding: 12rpx 0;
  font-size: 22rpx;
  color: #4a6741;
}

.reply-count:active {
  opacity: 0.7;
}

.reply-items {
  margin-top: 8rpx;
}

.reply-item {
  padding: 12rpx 0;
}

.reply-user {
  font-size: 22rpx;
  color: #4a6741;
  font-weight: 600;
  margin-right: 8rpx;
}

.reply-content {
  font-size: 22rpx;
  color: #666;
}

.empty-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 24rpx;
}

.add-comment-btn {
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 24rpx;
  border: none;
}

.add-comment-btn::after {
  border: none;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80rpx;
}

.action-icon-img {
  width: 44rpx;
  height: 44rpx;
  margin-bottom: 4rpx;
}

.action-icon-img.icon-active {
  filter: brightness(0) saturate(100%) invert(52%) sepia(82%) saturate(1463%) hue-rotate(348deg) brightness(96%) contrast(96%);
}

.icon-wrap {
  position: relative;
  margin-bottom: 4rpx;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  background: #e64340;
  border-radius: 20rpx;
  min-width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
}

.badge-text {
  font-size: 18rpx;
  color: #fff;
  line-height: 1;
}

.icon-text {
  font-size: 44rpx;
  color: #666;
  display: block;
  text-align: center;
  line-height: 1;
  margin-bottom: 4rpx;
}

.icon-text.active {
  color: #e64340;
}

.action-text {
  font-size: 20rpx;
  color: #666;
}

.action-text.text-active {
  color: #e64340;
}

.action-btn {
  flex: 1;
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border: none;
  padding: 0 16rpx;
  margin: 0;
}

.action-btn::after {
  border: none;
}

.buy-btn {
  flex: 1;
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  border: none;
}

.buy-btn::after {
  border: none;
}

.form-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.form-panel {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #F0EBE3;
}

.form-title {
  font-size: 32rpx;
  font-weight: 600;
}

.form-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.form-body {
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.comment-input {
  width: 100%;
  min-height: 200rpx;
  padding: 24rpx;
  background: #faf7f2;
  border-radius: 8px;
  font-size: 28rpx;
}

.char-count {
  text-align: right;
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.submit-btn {
  width: 100%;
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.submit-btn::after {
  border: none;
}

.replying-hint {
  padding: 16rpx;
  background: #f0ebe3;
  border-radius: 8px;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #666;
}
</style>
