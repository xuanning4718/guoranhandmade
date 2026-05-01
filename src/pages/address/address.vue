<template>
  <view class="address-page">
    <view v-if="addresses.length > 0" class="address-list">
      <view
        v-for="addr in addresses"
        :key="addr.id"
        class="address-item"
        :class="{ active: addr.isDefault }"
      >
        <view class="address-main" @click="selectAddress(addr)">
          <view class="address-header">
            <text class="name">{{ addr.name }}</text>
            <text class="phone">{{ addr.phone }}</text>
            <view v-if="addr.isDefault" class="default-tag">
              <text>默认</text>
            </view>
          </view>
          <text class="detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</text>
        </view>
        <view class="address-actions">
          <view class="action-btn" @click="editAddress(addr)">
            <text>编辑</text>
          </view>
          <view class="action-btn delete" @click="deleteAddress(addr.id)">
            <text>删除</text>
          </view>
          <view v-if="!addr.isDefault" class="action-btn" @click="setDefault(addr.id)">
            <text>设为默认</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-address">
      <text class="empty-icon">📍</text>
      <text class="empty-text">暂无收货地址</text>
      <text class="empty-hint">点击下方按钮添加第一个地址</text>
    </view>

    <view class="add-btn-wrap">
      <button class="add-btn" @click="addAddress">+ 新增地址</button>
    </view>

    <view v-if="showForm" class="form-mask" @click="closeForm">
      <view class="form-panel" @click.stop>
        <view class="form-header">
          <text class="form-title">{{ editingId ? '编辑地址' : '新增地址' }}</text>
          <view class="form-close" @click="closeForm">
            <text>✕</text>
          </view>
        </view>
        <view class="form-body">
          <view class="form-group">
            <text class="form-label">收货人</text>
            <input class="form-input" placeholder="请输入姓名" :value="form.name" @input="onNameInput" />
          </view>
          <view class="form-group">
            <text class="form-label">手机号</text>
            <input class="form-input" type="number" placeholder="请输入手机号" :value="form.phone" @input="onPhoneInput" />
          </view>
          <view class="form-group">
            <text class="form-label">所在地区</text>
            <picker mode="region" :value="regionValue" @change="onRegionChange">
              <view class="region-picker">
                {{ form.region || '请选择省/市/区' }}
              </view>
            </picker>
          </view>
          <view class="form-group">
            <text class="form-label">详细地址</text>
            <textarea class="form-input detail-input" placeholder="街道门牌等详细地址" :value="form.detail" @input="onDetailInput" />
          </view>
          <view class="form-group checkbox-group">
            <view class="checkbox-item" @click="toggleDefault">
              <view class="checkbox" :class="{ checked: form.isDefault }">
                <text v-if="form.isDefault">✓</text>
              </view>
              <text class="checkbox-label">设为默认地址</text>
            </view>
          </view>
          <button class="save-btn" @click="saveAddress">保存地址</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

function persistAddresses(addrs) {
  uni.setStorageSync('addresses', JSON.stringify(addrs))
}

function loadAddresses() {
  try {
    const data = uni.getStorageSync('addresses')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const addresses = ref(loadAddresses())
const showForm = ref(false)
const editingId = ref(null)
const form = ref({
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false
})
const regionValue = ref([])

function parseRegion(region) {
  return { province: '', city: '', district: '', detail: region }
}

function onNameInput(e) {
  form.value.name = e.detail.value
}

function onPhoneInput(e) {
  form.value.phone = e.detail.value
}

function onRegionChange(e) {
  const parts = e.detail.value
  form.value.region = parts.join('')
  regionValue.value = parts
}

function onDetailInput(e) {
  form.value.detail = e.detail.value
}

function toggleDefault() {
  form.value.isDefault = !form.value.isDefault
}

function addAddress() {
  editingId.value = null
  form.value = {
    name: '',
    phone: '',
    region: '',
    detail: '',
    isDefault: false
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function editAddress(addr) {
  editingId.value = addr.id
  form.value = {
    name: addr.name,
    phone: addr.phone,
    region: addr.province + (addr.city || '') + (addr.district || ''),
    detail: addr.detail,
    isDefault: addr.isDefault
  }
  regionValue.value = [addr.province, addr.city || '', addr.district || '']
  showForm.value = true
}

function deleteAddress(id) {
  let deletingId
  uni.showModal({
    title: '提示',
    content: '确定删除该地址吗？',
    success: (res) => {
      if (res.confirm) {
        addresses.value = addresses.value.filter(a => a.id !== id)
        persistAddresses(addresses.value)
      }
    }
  })
}

function setDefault(id) {
  addresses.value.forEach(a => {
    a.isDefault = a.id === id
  })
  persistAddresses(addresses.value)
}

function selectAddress(addr) {
  uni.setStorageSync('address', JSON.stringify(addr))
  uni.showToast({ title: '已选择', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 500)
}

function saveAddress() {
  const { name, phone, region, detail, isDefault } = form.value

  if (!name.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (!phone.trim() || phone.length < 11) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (!detail.trim()) {
    uni.showToast({ title: '请输入详细地址', icon: 'none' })
    return
  }

  if (isDefault) {
    addresses.value.forEach(a => { a.isDefault = false })
  }

  const regionParts = parseRegion(region)

  if (editingId.value) {
    const idx = addresses.value.findIndex(a => a.id === editingId.value)
    if (idx > -1) {
      addresses.value[idx] = {
        ...addresses.value[idx],
        name: name.trim(),
        phone: phone.trim(),
        ...regionParts,
        detail: detail.trim(),
        isDefault: isDefault || false
      }
    }
  } else {
    addresses.value.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: name.trim(),
      phone: phone.trim(),
      ...regionParts,
      detail: detail.trim(),
      isDefault: addresses.value.length === 0 || isDefault
    })
  }

  persistAddresses(addresses.value)
  closeForm()
  uni.showToast({ title: '保存成功', icon: 'success' })
}

onMounted(() => {
  addresses.value = loadAddresses()
})
</script>

<style scoped>
.address-page {
  min-height: 100vh;
  background: #faf7f2;
  padding-bottom: 160rpx;
}

.address-list {
  padding: 24rpx 32rpx;
}

.address-item {
  background: #fff;
  border-radius: 12px;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.address-item.active {
  border: 2rpx solid #4A6741;
}

.address-main:active {
  opacity: 0.8;
}

.address-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-right: 24rpx;
}

.phone {
  font-size: 24rpx;
  color: #666;
  margin-right: 16rpx;
}

.default-tag {
  background: #4a6741;
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
}

.detail {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
  display: block;
}

.address-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F0EBE3;
}

.action-btn {
  font-size: 22rpx;
  color: #666;
}

.action-btn:active {
  opacity: 0.6;
}

.action-btn.delete {
  color: #d46a6a;
}

.empty-address {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 32rpx;
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

.add-btn-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.add-btn {
  background: #4a6741;
  color: #fff;
  border-radius: 40rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.add-btn::after {
  border: none;
}

.form-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.form-panel {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #F0EBE3;
}

.form-title {
  font-size: 32rpx;
  font-weight: 600;
}

.form-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.form-body {
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

.form-input {
  width: 100%;
  padding: 24rpx;
  background: #faf7f2;
  border-radius: 8px;
  font-size: 28rpx;
}

.detail-input {
  min-height: 160rpx;
}

.region-picker {
  width: 100%;
  padding: 24rpx;
  background: #faf7f2;
  border-radius: 8px;
  font-size: 28rpx;
  color: #333;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
}

.checkbox.checked {
  background: #4a6741;
  border-color: #4a6741;
}

.checkbox-label {
  font-size: 28rpx;
  color: #333;
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