<template>
  <view v-if="visible" class="comment-panel-mask" @tap="$emit('close')">
    <view class="comment-panel" catchtap @touchmove.stop>
      <view class="panel-header">
        <text class="panel-title">评论 ({{ comments.length }})</text>
        <view class="panel-close" @click="$emit('close')">
          <text>✕</text>
        </view>
      </view>

      <scroll-view scroll-y class="panel-scroll" @touchmove.stop>
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
                  <view class="like-trigger" @click="toggleLike(rootComment.id)">
                    <text class="like-count">{{ rootComment.likes || '' }}</text>
                    <text class="like-icon">{{ likedComments[rootComment.id] ? '♥' : '♡' }}</text>
                  </view>
                </view>
                <text class="comment-content">{{ rootComment.content }}</text>
                <view class="comment-footer">
                  <text class="comment-time">{{ formatCommentTime(rootComment.createdAt) }}</text>
                  <view class="reply-trigger" @click="openReply(rootComment)">
                    <text class="reply-text">回复</text>
                  </view>
                </view>

                <view v-if="replies[String(rootComment.id)]?.length > 0" class="reply-section">
                  <view v-for="reply in replies[String(rootComment.id)]" :key="reply.id" class="reply-item">
                    <view class="reply-avatar" :class="{ 'avatar-default': !reply.userAvatar }">
                      <view class="avatar-text-small">{{ reply.userName?.charAt(0) || '用' }}</view>
                    </view>
                    <view class="reply-body-wrap">
                      <view class="reply-header">
                        <text class="reply-user">{{ reply.userName }}</text>
                      </view>
                      <text class="reply-content">{{ reply.content }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-comments">
          <text class="empty-icon">💬</text>
          <text class="empty-text">暂无评论</text>
        </view>
      </scroll-view>

      <view class="panel-footer">
        <view class="input-wrap">
          <input
            class="comment-input"
            :placeholder="replyTarget ? '回复 ' + replyTarget.userName : '发表评论'"
            v-model="inputText"
            @confirm="submitComment"
          />
          <view class="send-btn" @click="submitComment">
            <text>发送</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getComments, addComment, likeComment as likeCommentApi } from '../../api/index.js'
import { getUserInfo, isProfileComplete } from '../../services/auth.js'
import { formatRelativeTime } from '../../utils/formatTime.js'

const props = defineProps({
  visible: Boolean,
  productId: Number
})

const emit = defineEmits(['close'])

const comments = ref([])
const inputText = ref('')
const replyTarget = ref(null)
const likedComments = ref({})

const rootComments = computed(() => {
  return comments.value.filter(c => {
    const pid = typeof c.parentId === 'string' ? parseInt(c.parentId) : c.parentId
    return !pid || pid === 0
  })
})

const replies = computed(() => {
  const map = {}
  comments.value.forEach(c => {
    const pid = typeof c.parentId === 'string' ? parseInt(c.parentId) : c.parentId
    if (pid && pid !== 0) {
      const key = String(pid)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
  })
  return map
})

function loadComments() {
  if (!props.productId || !props.visible) return
  getComments(props.productId).then(res => {
    if (res.data && Array.isArray(res.data)) {
      comments.value = res.data
    }
  }).catch(e => console.error('[CommentPanel] load failed:', e))
}

watch(() => props.visible, (val) => {
  if (val) {
    loadComments()
  }
})

watch(() => props.productId, () => {
  if (props.visible) {
    loadComments()
  }
})

function openReply(comment) {
  replyTarget.value = comment
  inputText.value = ''
}

async function submitComment() {
  if (!inputText.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  if (!isProfileComplete()) {
    uni.showToast({ title: '请先完善个人资料', icon: 'none' })
    return
  }

  const userInfo = getUserInfo()
  const comment = {
    productId: props.productId,
    userId: 0,
    parentId: replyTarget.value ? replyTarget.value.id : null,
    userName: userInfo.nickName || '匿名用户',
    userAvatar: userInfo.avatar || '',
    content: inputText.value,
    createdAt: new Date().toISOString()
  }

  try {
    uni.showLoading({ title: '发布中...' })
    await addComment(comment)
    inputText.value = ''
    replyTarget.value = null
    await loadComments()
    uni.hideLoading()
    uni.showToast({ title: '发布成功', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '发布失败', icon: 'none' })
  }
}

async function toggleLike(commentId) {
  if (likedComments.value[commentId]) return
  const comment = comments.value.find(c => c.id === commentId)
  if (!comment) return
  likedComments.value = { ...likedComments.value, [commentId]: true }
  const prev = comment.likes
  comment.likes = (comment.likes || 0) + 1
  try {
    await likeCommentApi(commentId)
  } catch (e) {
    likedComments.value = { ...likedComments.value, [commentId]: false }
    comment.likes = prev
  }
}

function formatCommentTime(ts) {
  return formatRelativeTime(ts)
}

function onAvatarError(commentId) {
  const idx = comments.value.findIndex(c => c.id === commentId)
  if (idx > -1) {
    comments.value[idx].userAvatar = ''
  }
}
</script>

<style scoped>
.comment-panel-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
}

.comment-panel {
  background: #faf7f2;
  border-radius: 32rpx 32rpx 0 0;
  width: 100%;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0ebe3;
}

.panel-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.panel-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
  max-height: 50vh;
  padding: 24rpx 32rpx;
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
  background: #c4a882;
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

.comment-content-wrap {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  margin-bottom: 8rpx;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comment-time {
  font-size: 22rpx;
  color: #bbb;
}

.reply-trigger {
  font-size: 22rpx;
  color: #4a6741;
  padding: 4rpx 8rpx;
}

.like-trigger {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.like-count {
  font-size: 20rpx;
  color: #999;
}

.like-icon {
  font-size: 28rpx;
  color: #999;
}

.like-icon.liked {
  color: #e64340;
}

.reply-section {
  margin-top: 16rpx;
}

.reply-item {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 0;
}

.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reply-avatar.avatar-default {
  background: #c4a882;
}

.avatar-text-small {
  font-size: 18rpx;
  color: #fff;
  font-weight: 600;
}

.reply-body-wrap {
  flex: 1;
  min-width: 0;
}

.reply-header {
  margin-bottom: 4rpx;
}

.reply-user {
  font-size: 22rpx;
  color: #4a6741;
  font-weight: 600;
}

.reply-content {
  font-size: 22rpx;
  color: #666;
}

.empty-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
  opacity: 0.4;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.panel-footer {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0ebe3;
  background: #faf7f2;
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
}

.comment-input {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  height: 64rpx;
}

.send-btn {
  background: #4a6741;
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
}

.send-btn:active {
  opacity: 0.8;
}

.send-btn text {
  color: #fff;
  font-size: 24rpx;
}
</style>
