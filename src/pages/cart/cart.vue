<template>
  <view class="wishlist-page">
    <view v-if="wishlistItems.length > 0" class="wishlist-content">
      <view v-for="item in wishlistItems" :key="item.productId" class="wishlist-item">
        <view class="item-image" :style="{ backgroundColor: itemColors[item.productId % itemColors.length] }" @click="viewProduct(item.productId)">
          <image
            v-if="item.image"
            class="product-img"
            :src="item.image"
            mode="aspectFill"
            @error="onImageError(item)"
          />
          <text v-else class="placeholder-text">{{ item.title.charAt(0) }}</text>
        </view>
        <view class="item-info">
          <text class="item-title">{{ item.title }}</text>
          <view class="item-tags">
            <text v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="tag">{{ tag }}</text>
          </view>
          <view class="item-footer">
            <text class="item-date">加入于 {{ formatItemDate(item) }}</text>
            <view class="item-actions">
              <view class="action-view" @click="viewProduct(item.productId)">
                <text>查看</text>
              </view>
              <view class="action-remove" @click="removeItem(item.productId)">
                <text>移除</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-wishlist">
      <image class="empty-icon" src="/static/images/tab-cart.png" mode="aspectFit" />
      <text class="empty-text">意愿是空的</text>
      <text class="empty-hint">遇到喜欢的作品就加入意愿吧</text>
      <button class="go-browse-btn" @click="goBrowse">去逛逛</button>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useWishlistStore } from '../../stores/cart.js'

const wishlistStore = useWishlistStore()
const wishlistItems = computed(() => wishlistStore.items)

const itemColors = [
  '#E8D5BC', '#D5E8D4', '#E8D4E5', '#D4E5E8', '#E5D4C4', '#D4DCE8'
]

const currentYear = new Date().getFullYear()

function formatItemDate(item) {
  if (item.addedAtYr && item.addedAtYr !== currentYear) {
    return `${item.addedAtYr}/${item.addedAt}`
  }
  return item.addedAt
}

function goBrowse() {
  uni.switchTab({ url: '/pages/index/index' })
}

function viewProduct(productId) {
  uni.navigateTo({
    url: `/pages/product/product?id=${productId}`
  })
}

function onImageError(item) {
  item.image = ''
}

function removeItem(productId) {
  uni.showModal({
    title: '提示',
    content: '确定要移除该作品吗？',
    success: (res) => {
      if (res.confirm) {
        wishlistStore.removeItem(productId)
      }
    }
  })
}
</script>

<style scoped>
.wishlist-page {
  min-height: 100vh;
  background: #faf7f2;
  padding: 24rpx;
}

.wishlist-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.wishlist-item {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 24rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
  overflow: hidden;
}

.product-img {
  width: 100%;
  height: 100%;
}

.placeholder-text {
  font-size: 48rpx;
  color: rgba(255, 255, 255, 0.7);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-title {
  font-size: 24rpx;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.tag {
  font-size: 18rpx;
  color: #4a6741;
  background: rgba(74, 103, 65, 0.08);
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-date {
  font-size: 22rpx;
  color: #999;
}

.item-actions {
  display: flex;
  gap: 16rpx;
}

.action-view,
.action-remove {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.action-view:active,
.action-remove:active {
  opacity: 0.6;
}

.action-view {
  background: rgba(74, 103, 65, 0.1);
  color: #4a6741;
}

.action-remove {
  background: rgba(204, 75, 75, 0.1);
  color: #d46a6a;
}

.empty-wishlist {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 32rpx;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 32rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 48rpx;
}

.go-browse-btn {
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  padding: 0 64rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.go-browse-btn::after {
  border: none;
}
</style>
