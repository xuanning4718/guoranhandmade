<template>
  <view class="search-page">
    <view class="search-header" :style="{ paddingTop: navBarHeight + 'px' }">
      <view class="search-bar-wrap">
        <view class="search-bar">
          <text class="search-icon">🔍</text>
          <input
            class="search-input"
            placeholder="搜索手作好物"
            confirm-type="search"
            @confirm="doSearch"
            @input="onInput"
            :value="keyword"
          />
          <view v-if="keyword" class="clear-btn" @click="clearInput">
            <text>✕</text>
          </view>
        </view>
        <view class="cancel-btn" @click="goBack">
          <text>取消</text>
        </view>
      </view>
    </view>

    <view v-if="!isSearching" class="search-content">
      <view v-if="hotKeywords.length > 0" class="hot-search">
        <view class="section-header">
          <text class="section-title">热门搜索</text>
        </view>
        <view class="keywords-wrap">
          <view
            v-for="kw in hotKeywords"
            :key="kw"
            class="keyword-tag"
            @click="searchKeyword(kw)"
          >
            <text>{{ kw }}</text>
          </view>
        </view>
      </view>

      <view v-if="searchHistory.length > 0" class="search-history">
        <view class="section-header">
          <text class="section-title">历史搜索</text>
          <text class="clear-history" @click="clearHistory">清除</text>
        </view>
        <view class="keywords-wrap">
          <view
            v-for="kw in searchHistory"
            :key="kw"
            class="keyword-tag history"
            @click="searchKeyword(kw)"
          >
            <text>{{ kw }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="search-content">
      <view v-if="searchResults.length > 0" class="result-info">
        <text class="result-text">找到 {{ searchResults.length }} 件相关商品</text>
      </view>

      <view v-if="searchResults.length > 0" class="product-grid">
        <view class="product-column">
          <ProductCard
            v-for="product in searchResultsLeft"
            :key="product.id"
            :product="product"
          />
        </view>
        <view class="product-column">
          <ProductCard
            v-for="product in searchResultsRight"
            :key="product.id"
            :product="product"
          />
        </view>
      </view>

      <view v-if="searchResults.length === 0 && keyword" class="empty-result">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">未找到相关商品</text>
        <text class="empty-hint">换一个关键词试试吧</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ProductCard from '../../components/ProductCard.vue'
import { getProducts } from '../../api/index.js'

const keyword = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const navBarHeight = ref(0)
const hotKeywords = ref(['蛋糕', '冰箱贴', '旅行图册', '手抄报', '鹅卵石'])
const searchHistory = ref([])

const searchResultsLeft = computed(() =>
  searchResults.value.filter((_, i) => i % 2 === 0)
)
const searchResultsRight = computed(() =>
  searchResults.value.filter((_, i) => i % 2 === 1)
)

function saveHistory() {
  uni.setStorageSync('search_history', JSON.stringify(searchHistory.value))
}

function clearHistory() {
  uni.showModal({
    title: '提示',
    content: '确定清除搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = []
        saveHistory()
      }
    }
  })
}

onMounted(() => {
  try {
    const history = uni.getStorageSync('search_history')
    searchHistory.value = history ? JSON.parse(history) : []
  } catch {
    searchHistory.value = []
  }

  const sysInfo = uni.getSystemInfoSync()
  let height = 0
  try {
    const menuBtn = uni.getMenuButtonBoundingClientRect()
    height = menuBtn && menuBtn.bottom > 0 ? menuBtn.bottom + 8 : sysInfo.statusBarHeight + 40
  } catch {
    height = sysInfo.statusBarHeight + 40
  }
  navBarHeight.value = height
})

let searchTimer = null

function onInput() {
  if (searchTimer) clearTimeout(searchTimer)

  if (keyword.value.trim()) {
    searchTimer = setTimeout(() => {
      doSearch()
    }, 500)
  } else {
    isSearching.value = false
    searchResults.value = []
  }
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return

  isSearching.value = true

  addToHistory(kw)

  const result = await getProducts({ keyword: kw })
  searchResults.value = result.data
}

function addToHistory(kw) {
  const idx = searchHistory.value.indexOf(kw)
  if (idx > -1) {
    searchHistory.value.splice(idx, 1)
  }
  searchHistory.value.unshift(kw)
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  saveHistory()
}

function searchKeyword(kw) {
  keyword.value = kw
  doSearch()
}

function clearInput() {
  keyword.value = ''
  isSearching.value = false
  searchResults.value = []
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: #faf7f2;
}

.search-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

.search-bar-wrap {
  display: flex;
  align-items: center;
  padding-bottom: 24rpx;
  padding-left: 32rpx;
  padding-right: 32rpx;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: #faf7f2;
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 24rpx;
  color: #333;
}

.clear-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #999;
}

.cancel-btn {
  margin-left: 24rpx;
  font-size: 24rpx;
  color: #4a6741;
}

.search-content {
  padding: 32rpx;
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

.clear-history {
  font-size: 24rpx;
  color: #999;
}

.keywords-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.keyword-tag {
  padding: 12rpx 24rpx;
  background: #fff;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.keyword-tag:active {
  opacity: 0.7;
}

.keyword-tag.history {
  background: #faf7f2;
  color: #666;
}

.result-info {
  margin-bottom: 24rpx;
}

.result-text {
  font-size: 24rpx;
  color: #999;
}

.product-grid {
  display: flex;
  padding: 24rpx;
  gap: 24rpx;
}

.product-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 32rpx;
  opacity: 0.4;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #999;
}
</style>
