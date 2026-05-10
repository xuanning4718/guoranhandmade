<template>
  <view v-if="product" class="product-page">
    <scroll-view scroll-y class="scroll-content" @click="closeCommentInput">
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
          <text class="time-label">上架时间：</text>
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

      <view v-if="commentEnabled" class="comment-section">
        <view class="section-header">
          <text class="section-title">评论 {{ comments.length }}</text>
        </view>

        <view v-if="comments.length > 0" class="comment-list">
          <view v-for="rootComment in rootComments" :key="rootComment.id" class="comment-item">
            <view class="comment-main">
              <view class="comment-avatar" :class="{ 'avatar-default': !rootComment.userAvatar }">
                <image v-if="rootComment.userAvatar" class="avatar-img" :src="rootComment.userAvatar" mode="aspectFill" @error="onAvatarError(rootComment.id)" />
                <text v-else class="avatar-text">{{ rootComment.userName?.charAt(0) || '用' }}</text>
              </view>
              <view class="comment-content-wrap">
                <view class="comment-header">
                  <text class="comment-user">{{ rootComment.userName }}</text>
                </view>
                <text class="comment-content">{{ rootComment.content }}</text>
                <view class="comment-footer">
                  <view class="footer-left">
                    <text class="comment-time">{{ formatCommentTime(rootComment.createdAt) }}</text>
                    <view class="reply-trigger" @click="openReply(rootComment)">
                      <text class="reply-text">回复</text>
                    </view>
                  </view>
                  <view class="like-trigger" @click="toggleLike(rootComment.id)">
                    <text class="like-count">{{ rootComment.likes || '' }}</text>
                    <text class="like-icon">{{ likedComments[rootComment.id] ? '♥' : '♡' }}</text>
                  </view>
                </view>

                <view v-if="replies[String(rootComment.id)]?.length > 0" class="reply-section">
                  <view v-for="reply in replies[String(rootComment.id)]" :key="reply.id" class="reply-item">
                    <view class="reply-avatar" :class="{ 'avatar-default': !reply.userAvatar }">
                      <image v-if="reply.userAvatar" class="avatar-img" :src="reply.userAvatar" mode="aspectFill" />
                      <text v-else class="avatar-text">{{ reply.userName?.charAt(0) || '用' }}</text>
                    </view>
                    <view class="reply-body-wrap">
                      <view class="reply-header">
                        <text class="reply-user">{{ reply.userName }}</text>
                      </view>
                      <text class="reply-content">{{ reply.content }}</text>
                      <view class="reply-footer">
                        <text class="reply-time">{{ formatCommentTime(reply.createdAt) }}</text>
                        <view class="reply-like-trigger" @click="toggleReplyLike(reply.id)">
                          <text class="reply-like-count">{{ reply.likes || '' }}</text>
                          <text class="like-icon">{{ likedReplies[reply.id] ? '♥' : '♡' }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-comments">
          <text class="empty-text">快来抢沙发评论</text>
        </view>
      </view>
    </scroll-view>

      <view v-if="!showCommentInput" class="action-bar">
        <view class="comment-trigger" @click="focusCommentInput">
          <text class="comment-trigger-bar-text">留下你的想法吧</text>
        </view>
        <view class="action-btn-col">
          <view class="action-item" @click.stop="doToggleLike">
            <view class="icon-wrap">
              <image class="action-icon-img" :class="{ unliked: !isProductLiked }" :src="isProductLiked ? '/static/images/good-active.png' : '/static/images/good.png'" mode="aspectFit" />
              <view class="badge badge-outline" v-if="likedCount > 0">
                <text class="badge-text badge-text-dark">{{ likedCount }}</text>
              </view>
            </view>
          </view>
          <view class="action-item" @click.stop="doToggleFavorite">
            <view class="icon-wrap">
              <image class="action-icon-img" :src="favoriteStore.isProductFavorited(productId) ? '/static/images/收藏 -已收藏.png' : '/static/images/收藏-black.png'" mode="aspectFit" />
              <view class="badge badge-outline" v-if="(product?.favorites ?? 0) > 0">
                <text class="badge-text badge-text-dark">{{ product?.favorites ?? 0 }}</text>
              </view>
            </view>
          </view>
          <view class="action-item" @click.stop="showSharePoster = true">
            <view class="icon-wrap">
              <image class="action-icon-img" src="/static/images/icon-share.png" mode="aspectFit" />
            </view>
          </view>
        </view>
        <view class="wishlist-btn-wrap">
          <button :class="['action-btn', isProductInWishlist ? 'action-btn-wishlisted' : '']" @click.stop="handleWishlist">
            <text>{{ isProductInWishlist ? '查看意愿' : '加入意愿' }}</text>
          </button>
        </view>
      </view>

      <view v-else class="comment-input-bar" :style="commentBarTransform" @click.stop>
        <view class="comment-input-wrap">
          <view class="input-avatar" :class="{ 'avatar-default': !userInfo.avatar }">
            <image v-if="userInfo.avatar" class="avatar-img" :src="userInfo.avatar" mode="aspectFill" />
            <text v-else class="avatar-text">{{ userInfo.nickName?.charAt(0) || '用' }}</text>
          </view>
          <textarea
            class="input-field"
            auto-focus
            :focus="commentFocus"
            :placeholder="replyingTo ? '回复 ' + replyingUserName : '发表评论'"
            v-model="commentText"
            auto-height
            :maxlength="-1"
            :show-confirm-bar="false"
            :adjust-position="false"
            @confirm="replyingTo ? submitReplyDirect(replyingTo) : submitCommentDirect()"
            @blur="onCommentBlur"
          />
          <view class="send-btn" @click.stop="replyingTo ? submitReplyDirect(replyingTo) : submitCommentDirect()">
            <text class="send-btn-text">发送</text>
          </view>
        </view>
      </view>

    <SharePoster
      :visible="showSharePoster"
      :product="product"
      :creator="creator"
      @close="showSharePoster = false"
    />

    <view v-if="showProfileSetup" class="form-mask" @click="closeProfileSetup">
      <view class="form-panel" @click.stop>
        <view class="form-header">
          <text class="form-title">设置资料</text>
          <view class="form-close" @click="closeProfileSetup">
            <text>✕</text>
          </view>
        </view>
        <view class="form-body">
          <view class="form-group">
            <text class="form-label">头像</text>
            <button class="avatar-upload-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <image v-if="tempAvatar" class="avatar-preview" :src="tempAvatar" mode="aspectFill" />
              <text v-else class="avatar-placeholder">点击选择头像</text>
            </button>
          </view>
          <view class="form-group">
            <text class="form-label">昵称</text>
            <input
              class="form-input"
              type="nickname"
              placeholder="请输入昵称"
              @input="onNicknameInput"
              :value="tempNickname"
            />
          </view>
          <button class="save-btn" @click="onSaveProfileComplete">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useWishlistStore } from '../../stores/cart.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import { getProductById, getCreators, getComments, addComment, likeComment as likeCommentApi, getCommentEnabled, updateProductStats } from '../../api/index.js'
import { getUserInfo, isProfileComplete, updateProfile, uploadAvatarToCloud } from '../../services/auth.js'
import { mockData } from '../../api/mockData.js'
import { formatRelativeTime } from '../../utils/formatTime.js'
import SharePoster from '../../components/SharePoster.vue'

const wishlistStore = useWishlistStore()
const favoriteStore = useFavoriteStore()

const product = ref(null)
const creator = ref(null)
const productId = ref(0)
const currentImage = ref(0)
const imgFailed = ref({})
const comments = ref([])
const commentText = ref('')
const replyingTo = ref(null)
const replyingUserName = ref('')
const userName = ref('')
const likedComments = ref({})
const likedReplies = ref({})

const showProfileSetup = ref(false)
const tempAvatar = ref('')
const tempNickname = ref('')
const pendingComment = ref(false)
const commentEnabled = ref(true)
const likedProduct = ref(false)
const showSharePoster = ref(false)
const showCommentInput = ref(false)
const commentFocus = ref(false)
const keyboardHeight = ref(0)

const commentBarTransform = computed(() => {
  return keyboardHeight.value > 0
    ? { transform: `translateY(-${keyboardHeight.value}px)` }
    : {}
})

const userInfo = computed(() => getUserInfo())

const placeholderColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

onShareAppMessage(() => {
  return {
    title: product.value?.title || '菓然手作',
    path: `/pages/product/product?id=${productId.value}`,
    imageUrl: product.value?.images?.[0] || '/static/images/guoran.jpg'
  }
})

onShareTimeline(() => {
  return {
    title: product.value?.title || '菓然手作',
    imageUrl: product.value?.images?.[0] || '/static/images/guoran.jpg'
  }
})

const rootComments = computed(() => {
  const pid = (c) => {
    const v = typeof c.parentId === 'string' ? parseInt(c.parentId) : c.parentId
    return isNaN(v) ? 0 : v
  }
  return comments.value.filter(c => pid(c) === 0)
})
const replies = computed(() => {
  const map = {}
  const pid = (c) => {
    const v = typeof c.parentId === 'string' ? parseInt(c.parentId) : c.parentId
    return isNaN(v) ? 0 : v
  }
  comments.value.forEach(c => {
    const p = pid(c)
    if (p > 0) {
      const key = String(p)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
  })
  return map
})

const wishlistCount = computed(() => wishlistStore.totalCount)
const isProductLiked = computed(() => likedProduct.value)
const likedCount = computed(() => product.value?.likes ?? 0)
const isProductInWishlist = computed(() => wishlistStore.isInWishlist(productId.value))

function closeCommentInput() {
  if (showCommentInput.value && !commentText.value.trim()) {
    showCommentInput.value = false
  }
}

function handleWishlist() {
  if (isProductInWishlist.value) {
    goWishlist()
  } else {
    addToWishlist()
  }
}

async function toggleLike(commentId) {
  if (likedComments.value[commentId]) return

  const comment = comments.value.find(c => c.id === commentId)
  if (!comment) return

  likedComments.value = {
    ...likedComments.value,
    [commentId]: true
  }
  const prevLikes = comment.likes
  comment.likes = (comment.likes || 0) + 1

  try {
    await likeCommentApi(commentId)
  } catch (e) {
    console.error('[product] likeComment failed:', e)
    likedComments.value = {
      ...likedComments.value,
      [commentId]: false
    }
    comment.likes = prevLikes
  }
}

async function toggleReplyLike(replyId) {
  if (likedReplies.value[replyId]) return

  const reply = comments.value.find(c => c.id === replyId)
  if (!reply) return

  likedReplies.value = {
    ...likedReplies.value,
    [replyId]: true
  }
  const prevLikes = reply.likes
  reply.likes = (reply.likes || 0) + 1

  try {
    await likeCommentApi(replyId)
  } catch (e) {
    console.error('[product] likeReply failed:', e)
    likedReplies.value = {
      ...likedReplies.value,
      [replyId]: false
    }
    reply.likes = prevLikes
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

function formatCommentTime(ts) {
  return formatRelativeTime(ts)
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
    if (commentData.data && Array.isArray(commentData.data)) {
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

function focusCommentInput() {
  if (!isProfileComplete()) {
    openProfileSetup()
    return
  }
  showCommentInput.value = true
}

function onCommentBlur() {
  setTimeout(() => {
    showCommentInput.value = false
    commentFocus.value = false
  }, 200)
}

function openReply(comment) {
  replyingTo.value = comment.id
  replyingUserName.value = comment.userName || ''
  commentText.value = ''
  showCommentInput.value = true
  nextTick(() => {
    commentFocus.value = true
  })
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

async function submitCommentDirect() {
  if (!commentText.value.trim()) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }

  const info = getUserInfo()
  const comment = {
    productId: productId.value,
    userId: 0,
    parentId: null,
    userName: info.nickName || '匿名用户',
    userAvatar: info.avatar || '',
    content: commentText.value,
    createdAt: new Date().toISOString()
  }

  uni.showLoading({ title: '发布中...' })
  try {
    await addComment(comment)
    commentText.value = ''
    showCommentInput.value = false
    await refreshComments()
    uni.hideLoading()
    uni.showToast({ title: '发布成功', icon: 'success' })
  } catch (err) {
    console.error('[product] submitComment failed:', err)
    uni.hideLoading()
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  }
}

async function submitReplyDirect(parentId) {
  if (!commentText.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }

  const info = getUserInfo()
  const reply = {
    productId: parseInt(productId.value),
    userId: 0,
    parentId: parseInt(parentId),
    userName: info.nickName || '匿名用户',
    userAvatar: info.avatar || '',
    content: commentText.value,
    createdAt: new Date().toISOString()
  }

  uni.showLoading({ title: '发布中...' })
  try {
    await addComment(reply)
    commentText.value = ''
    replyingTo.value = null
    replyingUserName.value = ''
    showCommentInput.value = false
    await refreshComments()
    uni.hideLoading()
    uni.showToast({ title: '回复成功', icon: 'success' })
  } catch (err) {
    console.error('[product] submitReply failed:', err)
    uni.hideLoading()
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  }
}

function openProfileSetup() {
  const info = getUserInfo()
  tempAvatar.value = ''
  tempNickname.value = ''
  showProfileSetup.value = true
}

function closeProfileSetup() {
  showProfileSetup.value = false
  pendingComment.value = false
}

function onChooseAvatar(e) {
  tempAvatar.value = e.detail.avatarUrl
}

function onNicknameInput(e) {
  tempNickname.value = e.detail.value
}

function onSaveProfileComplete() {
  if (!tempNickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (!tempAvatar.value) {
    uni.showToast({ title: '请上传头像', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })

  uploadAvatarToCloud(tempAvatar.value)
    .then(newAvatar => {
      const info = {
        nickName: tempNickname.value.trim(),
        avatar: newAvatar
      }
      updateProfile(info)
      uni.hideLoading()
      showProfileSetup.value = false
      uni.showToast({ title: '保存成功', icon: 'success' })

      setTimeout(() => {
        showCommentInput.value = true
      }, 500)
    })
    .catch(() => {
      uni.hideLoading()
      uni.showToast({ title: '保存失败', icon: 'none' })
    })
}

function onAvatarError(commentId) {
  const idx = comments.value.findIndex(c => c.id === commentId)
  if (idx > -1) {
    comments.value[idx].userAvatar = ''
  }
}

async function refreshComments() {
  try {
    const result = await getComments(productId.value)
    if (result.data && Array.isArray(result.data)) {
      comments.value = result.data
    }
  } catch (err) {
    console.error('[product] refreshComments failed:', err)
  }
}

function previewImage(url) {
  uni.previewImage({ urls: product.value.images, current: url })
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
      images: product.value.images,
      tags: product.value.tags,
      addedAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    })
  uni.showToast({ title: '已加入意愿', icon: 'success' })
}

async function doToggleLike() {
  if (!product.value?.id) return
  const wasLiked = likedProduct.value
  likedProduct.value = !wasLiked
  const newLiked = likedProduct.value

  const prevLikes = product.value.likes ?? 0
  product.value = {
    ...product.value,
    likes: prevLikes + (newLiked ? 1 : -1)
  }

  try {
    await updateProductStats(product.value.id, { likes: product.value.likes ?? 0 })
  } catch (e) {
    console.error('[product] sync likes failed:', e)
    likedProduct.value = wasLiked
    product.value = {
      ...product.value,
      likes: prevLikes + (wasLiked ? -1 : 1)
    }
  }
}

async function doToggleFavorite() {
  if (!product.value?.id) return
  const wasFavorited = favoriteStore.isProductFavorited(product.value.id)
  const added = favoriteStore.toggleProduct(product.value.id)

  const prevFavorites = product.value.favorites ?? 0
  product.value = {
    ...product.value,
    favorites: prevFavorites + (added ? 1 : -1)
  }

  try {
    await updateProductStats(product.value.id, { favorites: product.value.favorites ?? 0 })
  } catch (e) {
    console.error('[product] sync favorites failed:', e)
    favoriteStore.toggleProduct(product.value.id)
    product.value = {
      ...product.value,
      favorites: prevFavorites + (added ? -1 : 1)
    }
  }

  uni.showToast({ title: added ? '已收藏' : '取消收藏', icon: 'none' })
}

function goWishlist() {
  uni.switchTab({ url: '/pages/cart/cart' })
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

function onKeyboardHeightChange(res) {
  keyboardHeight.value = res.height || 0
}

onMounted(async () => {
  uni.onKeyboardHeightChange(onKeyboardHeightChange)

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  productId.value = parseInt(currentPage.options?.id || '0')

  const commentRes = await getCommentEnabled()
  commentEnabled.value = commentRes.data

  loadData()
})

onUnmounted(() => {
  uni.offKeyboardHeightChange(onKeyboardHeightChange)
})
</script>

<style scoped>
.product-page {
  min-height: 100vh;
  background: #faf7f2;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

.scroll-content {
  height: calc(100vh - 140rpx - env(safe-area-inset-bottom));
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
  font-size: 34rpx;
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
  font-size: 24rpx;
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
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-right: 16rpx;
}

.level-tag {
  font-size: 22rpx;
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
  font-size: 24rpx;
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
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #faf7f2;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #4a6741;
}

.contact-btn:active {
  opacity: 0.7;
}

.contact-icon-img {
  width: 42rpx;
  height: 42rpx;
}

.contact-text {
  font-size: 26rpx;
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
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
  display: block;
  margin-bottom: 24rpx;
}

.created-time {
  display: flex;
  align-items: center;
  margin: 16rpx 0;
  border: none;
  padding: 8rpx 0;
}

.time-label {
  font-size: 26rpx;
  color: #999;
  margin-right: 0;
}

.time-value {
  font-size: 24rpx;
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
  justify-content: flex-start;
  gap: 8rpx;
  margin-bottom: 24rpx;
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

.comment-main {
  display: flex;
  gap: 16rpx;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: #eee;
}

.comment-avatar.avatar-default {
  display: flex;
  align-items: center;
  justify-content: center;
}

.comment-avatar .avatar-img {
  width: 100%;
  height: 100%;
}

.comment-avatar .avatar-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}

.comment-avatar.avatar-default {
  background: #c4a882;
}

.comment-content-wrap {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 8rpx;
}

.comment-user {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

.comment-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
  display: block;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
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

.like-icon {
  font-size: 24rpx;
  color: #999;
}

.reply-list {
  margin-top: 16rpx;
  padding-left: 0;
}

.inline-reply {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #faf7f2;
  border-radius: 8px;
}

.reply-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #fff;
  border-radius: 8px;
  font-size: 26rpx;
  box-sizing: border-box;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 12rpx;
}

.reply-cancel {
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  background: transparent;
}

.reply-cancel text {
  font-size: 24rpx;
  color: #999;
}

.reply-submit {
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  background: #4a6741;
}

.reply-submit text {
  font-size: 24rpx;
  color: #fff;
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
  display: flex;
  gap: 12rpx;
}

.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: #eee;
}

.reply-avatar.avatar-default {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c4a882;
}

.reply-avatar .avatar-img {
  width: 100%;
  height: 100%;
}

.reply-avatar .avatar-text {
  font-size: 18rpx;
  color: #fff;
  font-weight: 600;
}

.reply-content-wrap {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4rpx;
}

.reply-user {
  font-size: 22rpx;
  color: #4a6741;
  font-weight: 600;
}

.reply-like-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 8rpx;
  border-radius: 12rpx;
}

.reply-like-trigger:active {
  opacity: 0.7;
}

.reply-like-count {
  font-size: 22rpx;
  color: #999;
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

.comment-input-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.input-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-avatar.avatar-default {
  background: #c4a882;
}

.input-avatar .avatar-img {
  width: 100%;
  height: 100%;
}

.input-avatar .avatar-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

.input-field {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  min-height: 72rpx;
  max-height: 200rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx;
  box-sizing: border-box;
  line-height: 1.5;
}

.send-btn {
  flex-shrink: 0;
  padding: 8rpx 0;
  align-self: flex-end;
}

.send-btn:active {
  opacity: 0.6;
}

.send-btn-text {
  color: #e8a44a;
  font-size: 28rpx;
  font-weight: 600;
}

.comment-trigger {
  width: 40%;
  flex-shrink: 0;
  height: 64rpx;
  background: #f5f2ed;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.comment-trigger:active {
  opacity: 0.8;
}

.comment-trigger-bar-text {
  font-size: 24rpx;
  color: #999;
}

.comment-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12rpx 12rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.action-btn-col {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 24rpx;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.action-icon-img {
  width: 48rpx;
  height: 48rpx;
}

.action-icon-img.icon-active {
  filter: brightness(0) saturate(100%) invert(52%) sepia(82%) saturate(1463%) hue-rotate(348deg) brightness(96%) contrast(96%);
}

.action-icon-img.unliked {
  filter: none;
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

.badge.badge-outline {
  background: transparent;
  border: none;
  min-width: 20rpx;
  height: auto;
  padding: 0;
}

.action-btn {
  flex: 1;
  background: #4a6741;
  color: #fff;
  border-radius: 44rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  border: none;
  margin: 0;
}

.action-btn::after {
  border: none;
}

.action-btn-wishlisted {
  background: #e8a44a;
}

.wishlist-btn-wrap {
  flex: 1;
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

.form-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
  display: block;
}

.avatar-upload-btn {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #faf7f2;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
}

.avatar-upload-btn::after {
  border: none;
}

.avatar-preview {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  font-size: 20rpx;
  color: #999;
}

.form-input {
  width: 100%;
  padding: 24rpx;
  background: #faf7f2;
  border-radius: 8px;
  font-size: 28rpx;
}

.save-btn {
  width: 100%;
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  margin-top: 32rpx;
  border: none;
}

.save-btn::after {
  border: none;
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

.comment-time {
  font-size: 22rpx;
  color: #bbb;
  align-self: flex-end;
}

.reply-body-wrap {
  flex: 1;
  min-width: 0;
}

.reply-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6rpx;
}

.reply-time {
  font-size: 20rpx;
  color: #bbb;
}
</style>
