<template>
  <view class="creator-list-page">
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-content">
        <text class="title">创作者</text>
      </view>
    </view>
    <scroll-view
      scroll-y
      class="scroll-content"
      :style="{ paddingTop: headerHeight + 'px' }"
    >
      <view class="creator-list">
        <CreatorCard
          v-for="creator in creators"
          :key="creator.id"
          :creator="creator"
          @click="goCreatorDetail"
        />
      </view>
      <view v-if="creators.length === 0" class="empty">
        <text class="empty-text">暂无创作者</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CreatorCard from '../../components/CreatorCard.vue'
import { getCreators } from '../../api/index.js'

const statusBarHeight = ref(0)
const headerHeight = ref(0)
const creators = ref([])

function goCreatorDetail(e) {
  const id = e?.id || e?.target?.dataset?.id
  if (id) {
    uni.navigateTo({ url: `/pages/creator/creator?id=${id}` })
  }
}

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  headerHeight.value = (sysInfo.statusBarHeight || 0) + 50

  const result = await getCreators()
  creators.value = result.data
})
</script>

<style scoped>
.creator-list-page {
  min-height: 100vh;
  background: #faf7f2;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #faf7f2;
}

.header-content {
  padding: 20rpx 32rpx;
}

.title {
  font-size: 44rpx;
  font-weight: 700;
  color: #4a6741;
}

.scroll-content {
  min-height: 100vh;
}

.creator-list {
  padding: 24rpx;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
