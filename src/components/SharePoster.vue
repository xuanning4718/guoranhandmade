<template>
  <view v-if="visible" class="poster-mask" @tap="handleClose">
    <view class="poster-panel" @tap.stop>
      <scroll-view scroll-y class="poster-body">
        <image v-if="posterImage" class="poster-preview" :src="posterImage" mode="widthFix" @tap="previewPoster" />
        <view v-else class="poster-loading">
          <text>海报生成中...</text>
        </view>
      </scroll-view>

      <canvas type="2d" :id="canvasId" :canvas-id="canvasId" class="poster-canvas" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }" />

      <view class="poster-actions">
        <view class="tip-text">点击海报预览，长按保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, nextTick, getCurrentInstance } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  product: { type: Object, default: null },
  creator: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save'])

const posterImage = ref('')
const canvasId = 'sharePosterCanvas'
const canvasWidth = 1016
const canvasHeight = 1440

const instance = getCurrentInstance()

function handleClose() {
  emit('close')
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function downloadRemoteImage(url) {
  return new Promise((resolve) => {
    uni.downloadFile({
      url,
      success: (res) => resolve(res.statusCode === 200 ? res.tempFilePath : null),
      fail: (e) => { console.error('[SharePoster] downloadRemoteImage fail:', e); resolve(null) }
    })
  })
}

function getCanvasNode(cid) {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery().in(instance.proxy)
    query.select('#' + cid).node().exec((res) => {
      if (res && res[0] && res[0].node) {
        resolve(res[0].node)
      } else {
        reject(new Error('Canvas node not found'))
      }
    })
  })
}

function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height
  const boxRatio = w / h
  let sx = 0, sy = 0, sW = img.width, sH = img.height

  if (imgRatio > boxRatio) {
    sW = img.height * boxRatio
    sx = (img.width - sW) / 2
  } else {
    sH = img.width / boxRatio
    sy = (img.height - sH) / 2
  }

  ctx.drawImage(img, sx, sy, sW, sH, x, y, w, h)
}

async function drawPoster() {
  if (!props.product) return

  try {
    await new Promise(r => setTimeout(r, 100))
    const canvas = await getCanvasNode(canvasId)
    const ctx = canvas.getContext('2d')
    const dpr = uni.getWindowInfo().pixelRatio

    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    ctx.scale(dpr, dpr)

    // Draw base background from local
    const baseImg = canvas.createImage()
    await new Promise((resolve, reject) => {
      baseImg.onload = resolve
      baseImg.onerror = reject
      baseImg.src = '/static/images/share_base.jpg'
    })
    ctx.drawImage(baseImg, 0, 0, canvasWidth, canvasHeight)

    // Get product image info
    const imgUrl = props.product.images?.[0]
    if (!imgUrl) return

    const localPath = await downloadRemoteImage(imgUrl)
    if (!localPath) return

    const imgInfo = await new Promise((resolve, reject) => {
      uni.getImageInfo({ src: localPath, success: resolve, fail: reject })
    })

    const img = canvas.createImage()
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = imgInfo.path })

    const isLandscape = img.width >= img.height
    const midY = canvasHeight / 2 // 720
    const leftThird = canvasWidth / 3 // ~338

    let imgX, imgY, imgW, imgH
    let textX, textY, tagY

    if (isLandscape) {
      imgX = leftThird - 20
      imgY = midY - 20
      imgW = canvasWidth * 0.6
      imgH = canvasHeight * 0.25

      textX = imgX
      textY = imgY + imgH + 70
      tagY = textY + 55
    } else {
      imgX = leftThird - 20
      imgY = midY - 20
      imgW = canvasWidth * 0.38
      imgH = canvasHeight * 0.375

      textX = imgX + imgW + 30
      textY = imgY + 50
      tagY = textY + 55
    }

    // Draw product image with rounded corners
    ctx.save()
    roundRect(ctx, imgX, imgY, imgW, imgH, 16)
    ctx.clip()
    drawImageCover(ctx, img, imgX, imgY, imgW, imgH)
    ctx.restore()

    // Draw creator name
    if (props.creator?.name) {
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 32px sans-serif'
      ctx.fillText('by ' + props.creator.name, textX, textY)
    }

    // Draw tags
    if (props.product.tags?.length > 0) {
      if (!isLandscape) {
        // 竖版: 一个一行
        ctx.font = 'bold 26px sans-serif'
        let tagYLine = tagY
        for (const tag of props.product.tags.slice(0, 3)) {
          const tw = ctx.measureText(tag).width + 32
          ctx.fillStyle = 'rgba(74, 103, 65, 0.1)'
          roundRect(ctx, textX, tagYLine - 20, tw, 34, 17)
          ctx.fill()
          ctx.fillStyle = '#4a6741'
          ctx.fillText(tag, textX + 16, tagYLine + 3)
          tagYLine += 46
        }
      } else {
        // 横版: 一行最多两个，超出换行
        ctx.font = 'bold 26px sans-serif'
        let tagX = textX
        let tagYLine = tagY
        let count = 0
        const tags = props.product.tags.slice(0, 5)
        for (const tag of tags) {
          const tw = ctx.measureText(tag).width + 32
          ctx.fillStyle = 'rgba(74, 103, 65, 0.1)'
          roundRect(ctx, tagX, tagYLine - 20, tw, 34, 17)
          ctx.fill()
          ctx.fillStyle = '#4a6741'
          ctx.fillText(tag, tagX + 16, tagYLine + 3)
          count++
          if (count % 2 === 0) {
            tagX = textX
            tagYLine += 46
          } else {
            tagX += tw + 16
          }
        }
      }
    }

    uni.canvasToTempFilePath({
      canvas,
      fileType: 'jpg',
      quality: 0.85,
      success: (res) => { posterImage.value = res.tempFilePath },
      fail: (err) => { console.error('[SharePoster] canvasToTempFilePath:', err) }
    })
  } catch (err) {
    console.error('[SharePoster] drawPoster failed:', err)
    uni.showToast({ title: '海报生成失败', icon: 'none', duration: 2000 })
    posterImage.value = ''
  }
}

function previewPoster() {
  emit('close')
  uni.previewImage({
    urls: [posterImage.value],
    current: posterImage.value
  })
}

watch(() => props.visible, async (val) => {
  if (val && props.product) {
    posterImage.value = ''
    await nextTick()
    setTimeout(drawPoster, 100)
  }
})
</script>

<style scoped>
.poster-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6); z-index: 999;
  display: flex; align-items: flex-end;
}
.poster-panel { width: 100%; max-height: 85vh; display: flex; flex-direction: column; }
.poster-body { flex: 1; overflow: hidden; position: relative; }
.poster-preview { width: 100%; height: auto; display: block; }
.poster-loading {
  display: flex; align-items: center; justify-content: center;
  height: 600rpx; background: #faf7f2; color: #999; font-size: 28rpx;
}
.poster-canvas { position: fixed; left: -9999px; top: -9999px; opacity: 0; pointer-events: none; }
.poster-actions { padding: 32rpx; background: #fff; text-align: center; }
.tip-text { font-size: 24rpx; color: #999; }
</style>
