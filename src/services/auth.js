const STORAGE_KEY = 'user_info'
let loginPromise = null

export function getUserInfo() {
  try {
    const info = uni.getStorageSync(STORAGE_KEY)
    if (info) return JSON.parse(info)
  } catch (e) {
    console.error('[auth] 获取用户信息失败:', e)
  }
  return { nickName: '', avatar: '', openId: '' }
}

function saveUserInfo(info) {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(info))
    uni.setStorageSync('user_logged_in', 'true')
  } catch (e) {
    console.error('[auth] 保存用户信息失败:', e)
  }
}

export function isProfileComplete() {
  const info = getUserInfo()
  return !!(info.nickName && info.avatar)
}

export function login() {
  if (loginPromise) return loginPromise

  loginPromise = new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          const info = getUserInfo()
          if (!info.openId) {
            info.openId = res.code
            saveUserInfo(info)
          }
          resolve({ code: 0, userInfo: info })
        } else {
          reject(new Error('wx.login 失败'))
        }
      },
      fail: (err) => reject(err)
    })
  }).finally(() => {
    loginPromise = null
  })

  return loginPromise
}

export function updateProfile(data) {
  try {
    const info = { ...getUserInfo(), ...data }
    saveUserInfo(info)
    return info
  } catch (e) {
    console.error('[auth] 更新用户信息失败:', e)
    return null
  }
}

export function uploadAvatarToCloud(filePath) {
  return new Promise((resolve, reject) => {
    const cloudPath = `user-avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => resolve(res.fileID),
      fail: (err) => reject(err)
    })
  })
}
