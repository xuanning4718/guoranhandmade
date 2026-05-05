<template>
  <view class="creator-card" @click="handleClick">
    <view class="creator-avatar" :style="{ backgroundColor: avatarColor }">
      <text class="avatar-text">{{ creator.name.charAt(0) }}</text>
    </view>
    <view class="creator-info">
      <view class="creator-name-wrap">
        <text class="creator-name">{{ creator.name }}</text>
        <view class="level-tag" :class="levelClass">
          <text>{{ creator.level }}</text>
        </view>
      </view>
      <text class="creator-bio">{{ creator.bio }}</text>
      <view class="creator-stats">
        <text class="stat-item">{{ creator.followers }} 粉丝</text>
        <text class="stat-item">{{ creator.worksCount }} 作品</text>
        <text v-if="creator.location" class="stat-item">{{ creator.location }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  creator: {
    type: Object,
    required: true
  }
})

const colors = ['#C4A882', '#8FB58A', '#B58F9E', '#8FA8B5', '#B5A88F', '#9E8FB5']
const avatarColor = computed(() => colors[(props.creator.id || 0) % colors.length])

const levelClass = computed(() => {
  const map = {
    '新手': 'level-new',
    '认证创作者': 'level-cert',
    '热门创作者': 'level-hot'
  }
  return map[props.creator.level] || 'level-new'
})

function handleClick() {
  uni.navigateTo({
    url: `/pages/creator/creator?id=${props.creator.id}`
  })
}
</script>

<style scoped>
.creator-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 24rpx;
}

.creator-card:active {
  opacity: 0.8;
}

.creator-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 36rpx;
  color: #fff;
  font-weight: 600;
}

.creator-info {
  flex: 1;
  min-width: 0;
}

.creator-name-wrap {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.creator-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-right: 16rpx;
}

.level-tag {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
}

.level-tag.level-new {
  background: #f0ebe3;
  color: #999;
}

.level-tag.level-cert {
  background: #e8f5e8;
  color: #4a8f62;
}

.level-tag.level-hot {
  background: #fff3e0;
  color: #e8a44a;
}

.creator-bio {
  font-size: 22rpx;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.creator-stats {
  display: flex;
  gap: 24rpx;
}

.stat-item {
  font-size: 22rpx;
  color: #999;
}
</style>
