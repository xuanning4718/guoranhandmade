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
        <view class="tags-wrap">
          <text v-for="tag in (product.tags || []).slice(0, 2)" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { mockData } from '../api/mockData.js'
import { useSwipeContextStore } from '../stores/swipeContext.js'

const swipeContext = useSwipeContextStore()

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  swipeList: {
    type: Array,
    default: null
  },
  swipeIndex: {
    type: Number,
    default: -1
  },
  sourcePage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])
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
  console.log('[ProductCard] click:', props.product.id, 'sourcePage:', props.sourcePage, 'swipeList len:', props.swipeList?.length, 'swipeIndex:', props.swipeIndex)

  const list = props.swipeList
  const index = props.swipeIndex >= 0 ? props.swipeIndex : (list ? list.findIndex(p => p.id === props.product.id) : -1)
  console.log('[ProductCard] resolved list len:', list?.length, 'index:', index)

  if (list && list.length > 0 && index >= 0) {
    swipeContext.enterSwipeMode(list, index, props.sourcePage || 'list')
    console.log('[ProductCard] entered swipe mode with list')
  } else {
    swipeContext.enterSwipeMode([props.product], 0, 'single')
    console.log('[ProductCard] entered single mode')
  }

  console.log('[ProductCard] navigating to immersive, id:', props.product.id)
  uni.navigateTo({
    url: `/pages/immersive/immersive?id=${props.product.id}`,
    fail: (err) => {
      console.error('[ProductCard] navigateTo failed:', err)
    }
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
  font-size: 26rpx;
  font-weight: 600;
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

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.tag {
  font-size: 22rpx;
  color: #4a6741;
  background: rgba(74, 103, 65, 0.08);
  padding: 2rpx 10rpx;
  border-radius: 16rpx;
}
</style>
