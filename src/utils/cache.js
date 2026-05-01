const CACHE_TTL = 5 * 60 * 1000

export function getCachedData(key) {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL) {
      uni.removeStorageSync(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function setCachedData(key, data) {
  try {
    uni.setStorageSync(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.warn('Cache write failed:', e)
  }
}

export function clearCache(key) {
  if (key) {
    uni.removeStorageSync(key)
  } else {
    const keys = [
      'lark_products',
      'lark_categories',
      'lark_creators',
      'lark_token'
    ]
    keys.forEach(k => uni.removeStorageSync(k))
  }
}

export function clearAllCache() {
  const keys = uni.getStorageInfoSync().keys || []
  keys.forEach(key => {
    if (key.startsWith('lark_')) {
      uni.removeStorageSync(key)
    }
  })
}
