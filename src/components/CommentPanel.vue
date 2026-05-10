<template>
  <view v-if="visible" class="comment-panel-mask" @tap="closePanel"></view>
  <view v-if="visible" class="comment-panel" :style="panelTransform" catchtap @touchmove.stop>
    <view class="panel-header">
      <text class="panel-title">评论 ({{ comments.length }})</text>
      <view class="panel-close" @click="closePanel">
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
              </view>
              <text class="comment-content">{{ rootComment.content }}</text>
              <view class="comment-footer">
                <view class="footer-left">
                  <text class="comment-time">{{ formatCommentTime(rootComment.createdAt) }}</text>
                  <view class="reply-trigger" @click="openReply(rootComment)">
                    <text class="reply-text">回复</text>
                  </view>
                </view>
                <view class="like-trigger" @click="toggleLike(rootComment.id)">
                  <text class="like-count">{{ rootComment.likes || '' }}</text>
                  <text class="like-icon">{{ likedComments[rootComment.id] ? '♥' : '♡' }}</text>
                </view>
              </view>

              <view v-if="replies[String(rootComment.id)]?.length > 0" class="reply-section">
                <view v-for="reply in replies[String(rootComment.id)]" :key="reply.id" class="reply-item">
                  <view class="reply-avatar" :class="{ 'avatar-default': !reply.userAvatar }">
                    <image v-if="reply.userAvatar" class="avatar-img" :src="reply.userAvatar" mode="aspectFill" />
                    <text v-else class="avatar-text">{{ reply.userName?.charAt(0) || '用' }}</text>
                  </view>
                  <view class="reply-body-wrap">
                    <view class="reply-header">
                      <text class="reply-user">{{ reply.userName }}</text>
                    </view>
                    <text class="reply-content">{{ reply.content }}</text>
                    <view class="reply-footer">
                      <text class="reply-time">{{ formatCommentTime(reply.createdAt) }}</text>
                      <view class="reply-like-trigger" @click="toggleLike(reply.id)">
                        <text class="reply-like-count">{{ reply.likes || '' }}</text>
                        <text class="like-icon">{{ likedComments[reply.id] ? '♥' : '♡' }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-comments">
        <text class="empty-text">快来抢沙发评论</text>
      </view>
    </scroll-view>

    <view class="panel-footer">
      <view v-if="!isProfileComplete()" class="input-wrap" @click="openProfileSetup">
        <view class="input-avatar" :class="{ 'avatar-default': true }">
          <text class="avatar-text">用</text>
        </view>
        <view class="input-field-wrap">
          <text class="input-placeholder">发表评论...</text>
        </view>
        <view class="send-btn">
          <text class="send-btn-text">发送</text>
        </view>
      </view>
      <view v-else class="input-wrap">
        <view class="input-avatar" :class="{ 'avatar-default': !userAvatar }">
          <image v-if="userAvatar" class="avatar-img" :src="userAvatar" mode="aspectFill" />
          <text v-else class="avatar-text">{{ userNickName?.charAt(0) || '用' }}</text>
        </view>
        <textarea
          class="input-field"
          :focus="focusInput"
          :placeholder="replyTarget ? '回复 ' + replyTarget.userName : '发表评论'"
          v-model="inputText"
          auto-height
          :maxlength="-1"
          :show-confirm-bar="false"
          :adjust-position="false"
          @confirm="submitComment"
        />
        <view class="send-btn" @click="submitComment">
          <text class="send-btn-text">发送</text>
        </view>
      </view>
    </view>
  </view>

  <view v-if="showProfileSetup" class="profile-mask" @click="closeProfileSetup">
    <view class="profile-panel" @click.stop>
      <view class="profile-header">
        <text class="profile-title">设置资料</text>
        <view class="profile-close" @click="closeProfileSetup">
          <text>✕</text>
        </view>
      </view>
      <view class="profile-body">
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
            :value="tempNickname"
          />
        </view>
        <button class="save-btn" @click="saveProfile">保存</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getComments, addComment, likeComment as likeCommentApi } from '../api/index.js'
import { getUserInfo, isProfileComplete, updateProfile, uploadAvatarToCloud } from '../services/auth.js'
import { formatRelativeTime } from '../utils/formatTime.js'

const props = defineProps({
  visible: Boolean,
  productId: Number
})

const emit = defineEmits(['close'])

const comments = ref([])
const inputText = ref('')
const replyTarget = ref(null)
const likedComments = ref({})
const showProfileSetup = ref(false)
const tempAvatar = ref('')
const tempNickname = ref('')
const pendingSubmit = ref(false)
const focusInput = ref(false)
const keyboardHeight = ref(0)

const panelTransform = computed(() => {
  return keyboardHeight.value > 0
    ? { transform: `translateY(-${keyboardHeight.value}px)` }
    : {}
})

const userNickName = computed(() => getUserInfo().nickName)
const userAvatar = computed(() => getUserInfo().avatar)

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

function onKeyboardHeightChange(res) {
  keyboardHeight.value = res.height || 0
}

onMounted(() => {
  uni.onKeyboardHeightChange(onKeyboardHeightChange)
})

onUnmounted(() => {
  uni.offKeyboardHeightChange(onKeyboardHeightChange)
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
    comments.value = []
    replyTarget.value = null
    inputText.value = ''
    focusInput.value = true
    loadComments()
  } else {
    focusInput.value = false
  }
})

watch(() => props.productId, () => {
  if (props.visible) {
    comments.value = []
    replyTarget.value = null
    inputText.value = ''
    focusInput.value = true
    loadComments()
  }
})

function closePanel() {
  emit('close')
}

function openReply(comment) {
  replyTarget.value = comment
  inputText.value = ''
  focusInput.value = true
}

function openProfileSetup() {
  const info = getUserInfo()
  tempAvatar.value = ''
  tempNickname.value = ''
  showProfileSetup.value = true
}

function closeProfileSetup() {
  showProfileSetup.value = false
  pendingSubmit.value = false
}

function onChooseAvatar(e) {
  tempAvatar.value = e.detail.avatarUrl
}

function onNicknameInput(e) {
  tempNickname.value = e.detail.value
}

function saveProfile() {
  if (!tempNickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (!tempAvatar.value) {
    uni.showToast({ title: '请上传头像', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })

  uploadAvatarToCloud(tempAvatar.value)
    .then(newAvatar => {
      const info = {
        nickName: tempNickname.value.trim(),
        avatar: newAvatar
      }
      updateProfile(info)
      uni.hideLoading()
      showProfileSetup.value = false
      uni.showToast({ title: '保存成功', icon: 'success' })

      if (pendingSubmit.value) {
        pendingSubmit.value = false
        setTimeout(() => {
          submitComment()
        }, 500)
      }
    })
    .catch(() => {
      uni.hideLoading()
      uni.showToast({ title: '保存失败', icon: 'none' })
    })
}

async function submitComment() {
  if (!inputText.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  if (!isProfileComplete()) {
    pendingSubmit.value = true
    openProfileSetup()
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
}

.comment-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #faf7f2;
  border-radius: 32rpx 32rpx 0 0;
  width: 100%;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  z-index: 10001;
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
  justify-content: flex-start;
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

.footer-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
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

.reply-avatar .avatar-img {
  width: 100%;
  height: 100%;
}

.reply-avatar .avatar-text {
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

.reply-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6rpx;
}

.reply-time {
  font-size: 20rpx;
  color: #bbb;
}

.reply-like-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 8rpx;
  border-radius: 12rpx;
}

.reply-like-trigger:active {
  opacity: 0.7;
}

.reply-like-count {
  font-size: 22rpx;
  color: #999;
}

.empty-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}

.panel-footer {
  padding: 16rpx 32rpx;
  padding-bottom: calc(8rpx + env(safe-area-inset-bottom));
  margin-bottom: 8rpx;
  border-top: 1rpx solid #f0ebe3;
  background: #faf7f2;
}

.input-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 12rpx 0;
}

.input-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-avatar.avatar-default {
  background: #c4a882;
}

.input-avatar .avatar-img {
  width: 100%;
  height: 100%;
}

.input-avatar .avatar-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

.input-field-wrap {
  flex: 1;
  min-height: 56rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx;
  display: flex;
  align-items: center;
}

.input-placeholder {
  font-size: 26rpx;
  color: #999;
}

.input-field {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  min-height: 56rpx;
  max-height: 200rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx;
  box-sizing: border-box;
  line-height: 1.5;
}

.send-btn {
  flex-shrink: 0;
  padding: 8rpx 0;
  align-self: flex-end;
}

.send-btn:active {
  opacity: 0.6;
}

.send-btn-text {
  color: #e8a44a;
  font-size: 28rpx;
  font-weight: 600;
}

.profile-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 10002;
  display: flex;
  align-items: flex-end;
}

.profile-panel {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0ebe3;
}

.profile-title {
  font-size: 32rpx;
  font-weight: 600;
}

.profile-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.profile-body {
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
</style>
