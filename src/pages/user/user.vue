<template>
  <view class="user-page">
    <view class="user-header" @click="showEditForm">
      <view class="user-info">
        <view class="user-avatar">
          <image v-if="userInfo.avatar" class="user-avatar-img" :src="userInfo.avatar" mode="aspectFill" />
          <text v-else class="avatar-text">{{ userInfo.nickName?.charAt(0) || '我' }}</text>
          <view class="avatar-edit-hint">
            <text class="edit-icon">✎</text>
          </view>
        </view>
        <view class="user-detail">
          <text class="user-name">{{ userInfo.nickName || '点击设置昵称' }}</text>
          <text v-if="!userInfo.nickName" class="user-desc">设置头像和昵称后即可发表评价</text>
        </view>
      </view>

      <view v-if="userInfo.nickName" class="user-stats">
        <view class="stat-item" @tap.stop="goTab('wishlist')">
          <text class="stat-num">{{ wishlistStore.totalCount }}</text>
          <text class="stat-label">意愿</text>
        </view>
        <view class="stat-item" @tap.stop="goTab('favorites')">
          <text class="stat-num">{{ favoriteStore.favoriteProducts.length }}</text>
          <text class="stat-label">收藏</text>
        </view>
        <view class="stat-item" @tap.stop="goTab('creators')">
          <text class="stat-num">{{ favoriteStore.favoriteCreators.length }}</text>
          <text class="stat-label">关注</text>
        </view>
      </view>
    </view>

    <view v-if="userInfo.nickName" class="section">
      <view class="section-title">我的收藏</view>
      <view v-if="favoriteProducts.length > 0" class="favorites-grid">
        <ProductCard
          v-for="product in favoriteProducts"
          :key="product.id"
          :product="product"
          :swipeList="favoriteProducts"
          :swipeIndex="favoriteProducts.indexOf(product)"
          sourcePage="user-favorites"
        />
      </view>
      <view v-else class="empty-favorites">
        <text class="empty-icon">♡</text>
        <text class="empty-text">还没有收藏的商品</text>
      </view>
    </view>

    <view v-if="userInfo.nickName" class="section">
      <view class="section-title">我关注的创作者</view>
      <view v-if="favoriteCreators.length > 0" class="favorites-creators">
        <CreatorCard
          v-for="creator in favoriteCreators"
          :key="creator.id"
          :creator="creator"
        />
      </view>
      <view v-else class="empty-creators">
        <text class="empty-icon">♡</text>
        <text class="empty-text">还没有关注的创作者</text>
      </view>
    </view>

    <view v-if="showForm" class="form-mask" @click="closeForm">
      <view class="form-panel" @click.stop>
        <view class="form-header">
          <text class="form-title">编辑资料</text>
          <view class="form-close" @click="closeForm">
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
              :value="tempNickname || userInfo.nickName"
            />
          </view>
          <button class="save-btn" @click="saveProfile">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ProductCard from '../../components/ProductCard.vue'
import CreatorCard from '../../components/CreatorCard.vue'
import { useFavoriteStore } from '../../stores/favorite.js'
import { useWishlistStore } from '../../stores/cart.js'
import { getProducts, getCreators } from '../../api/index.js'
import { login, getUserInfo, updateProfile, uploadAvatarToCloud } from '../../services/auth.js'

const favoriteStore = useFavoriteStore()
const wishlistStore = useWishlistStore()

const allProducts = ref([])
const allCreators = ref([])
const userInfo = ref({ nickName: '', avatar: '', openId: '' })
const showForm = ref(false)
const tempAvatar = ref('')
const tempNickname = ref('')

function onChooseAvatar(e) {
  tempAvatar.value = e.detail.avatarUrl
}

function onNicknameInput(e) {
  tempNickname.value = e.detail.value
}

function closeForm() {
  showForm.value = false
}

function saveProfile() {
  if (!tempNickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })

  let avatar = userInfo.value.avatar

  if (tempAvatar.value && tempAvatar.value !== userInfo.value.avatar) {
    uploadAvatarToCloud(tempAvatar.value)
      .then(newAvatar => {
        avatar = newAvatar
        doSave(avatar)
      })
      .catch(() => {
        doSave(null)
      })
  } else if (tempAvatar.value) {
    avatar = tempAvatar.value
    doSave(avatar)
  } else {
    doSave(null)
  }
}

function doSave(avatar) {
  const info = {
    nickName: tempNickname.value.trim(),
    avatar: avatar || userInfo.value.avatar
  }

  updateProfile(info)
  userInfo.value = getUserInfo()
  uni.hideLoading()
  showForm.value = false
  uni.showToast({ title: '保存成功', icon: 'success' })
}

onMounted(async () => {
  try {
    await login()
  } catch (e) {
    console.warn('[user] 静默登录失败:', e)
  }

  userInfo.value = getUserInfo()

  const [products, creators] = await Promise.all([
    getProducts(),
    getCreators()
  ])
  allProducts.value = products.data || []
  allCreators.value = creators.data || []
})

const favoriteProducts = computed(() =>
  allProducts.value.filter(p => favoriteStore.favoriteProducts.includes(p.id))
)
const favoriteCreators = computed(() =>
  allCreators.value.filter(c => favoriteStore.favoriteCreators.includes(c.id))
)

function showEditForm() {
  showForm.value = true
  tempAvatar.value = ''
  tempNickname.value = ''
}

function goTab(tab) {
  if (tab === 'wishlist') {
    uni.switchTab({ url: '/pages/cart/cart' })
  }
}
</script>

<style scoped>
.user-page {
  min-height: 100vh;
  background: #faf7f2;
  padding-bottom: 48rpx;
}

.user-header {
  background: linear-gradient(135deg, #4a6741, #6b8f62);
  padding: 48rpx 32rpx;
  padding-top: calc(48rpx + env(safe-area-inset-top));
  color: #fff;
}

.user-header:active {
  opacity: 0.95;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  position: relative;
  overflow: visible;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-text {
  font-size: 48rpx;
  color: #fff;
  font-weight: 600;
}

.avatar-edit-hint {
  position: absolute;
  bottom: -4rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.edit-icon {
  font-size: 20rpx;
  color: #4a6741;
}

.user-detail {
  flex: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.user-desc {
  font-size: 24rpx;
  opacity: 0.8;
}

.user-stats {
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 24rpx 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item:active {
  opacity: 0.8;
}

.stat-num {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  opacity: 0.8;
}

.section {
  background: #fff;
  margin: 24rpx 32rpx;
  border-radius: 12px;
  padding: 32rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
}

.empty-favorites,
.empty-creators {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  color: #ddd;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 24rpx;
  color: #999;
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

.favorites-grid {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.favorites-creators {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>
