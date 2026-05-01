<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { clearAllCache } from './utils/cache.js'

onLaunch(() => {
  console.log('App Launch')
  clearAllCache()
  wx.cloud.init({
    env: 'cloud1-6geuw2dr3aa3bd50',
    traceUser: true
  })
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
page {
  background-color: #faf7f2;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: #333;
  font-size: 28rpx;
  line-height: 1.6;
}

view,
text,
image,
scroll-view {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  border-radius: 0;
  font-size: inherit;
  color: inherit;
  line-height: inherit;
}

button::after {
  border: none;
}

image {
  display: block;
}

scroll-view {
  width: 100%;
}

.container {
  padding: 32rpx;
}

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.flex-1 { flex: 1; }

.text-primary { color: #4a6741; }
.text-accent { color: #c4a882; }
.text-muted { color: #999; }
.text-sm { font-size: 24rpx; }
.text-lg { font-size: 32rpx; }
.fw-bold { font-weight: 600; }

.mt-sm { margin-top: 16rpx; }
.mt-md { margin-top: 24rpx; }
.mb-sm { margin-bottom: 16rpx; }
.mb-md { margin-bottom: 24rpx; }
</style>
