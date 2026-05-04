<template>
  <view class="product-card" @click="handleClick">
    <view class="card-image">
      <image
        v-if="hasImage && !imageError"
        class="product-image"
        :src="lastImage"
        mode="aspectFill"
        lazy-load
        @error="onImageError"
      />
      <view v-else class="image-placeholder" :class="'placeholder-' + (category?.id || 'default')">
        <text class="placeholder-text">{{ categoryEmoji }}</text>
      </view>
    </view>
    <view class="card-content">
      <text class="card-title">{{ product.title }}</text>
      <view class="card-footer">
        <text class="card-tags">{{ tagText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { mockData } from '../api/mockData.js'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

const tagText = computed(() => {
  const tags = props.product?.tags
  if (!tags || !Array.isArray(tags)) return ''
  return tags.slice(0, 2).join(' · ')
})
const imageError = ref(false)
const hasImage = computed(() =>
  props.product.images && props.product.images.length > 0 && !imageError.value
)
const lastImage = computed(() => {
  const imgs = props.product.images || []
  return imgs.length > 0 ? imgs[imgs.length - 1] : ''
})

function onImageError() {
  imageError.value = true
}

const category = computed(() =>
  mockData.categories.find(c => c.id === props.product.category) || null
)
const categoryEmoji = computed(() => category.value?.emoji || '作')

function handleClick() {
  emit('click', props.product)
  uni.navigateTo({
    url: `/pages/product/product?id=${props.product.id}`
  })
}
</script>

<style scoped>
.product-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;
  page-break-inside: avoid;
  break-inside: avoid;
}

.product-card:active {
  transform: scale(0.98);
}

.card-image {
  position: relative;
  width: 100%;
  padding-top: 100%;
}

.card-image .product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.card-image .image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e8d5bc;
}

.card-image .placeholder-1 { background-color: #ffe4b5; }
.card-image .placeholder-2 { background-color: #e8e8e8; }
.card-image .placeholder-3 { background-color: #b5d5e8; }
.card-image .placeholder-4 { background-color: #ffe0cc; }
.card-image .placeholder-5 { background-color: #d5e8d4; }
.card-image .placeholder-6 { background-color: #e8d4e5; }
.card-image .placeholder-7 { background-color: #f0e4d4; }
.card-image .placeholder-8 { background-color: #d4dce8; }
.card-image .placeholder-default { background-color: #e8d5bc; }

.card-image .placeholder-text {
  font-size: 64rpx;
}

.card-image .category-tag {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: rgba(255, 255, 255, 0.9);
  font-size: 28rpx;
  padding: 4rpx 10rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.card-content {
  padding: 24rpx;
}

.card-title {
  font-size: 24rpx;
  color: #333;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.card-footer {
  display: flex;
  align-items: center;
}

.card-tags {
  font-size: 22rpx;
  color: #999;
}
</style>
