/**
 * 微博风格相对时间格式化
 * @param {number|string} ts - 毫秒时间戳
 * @returns {string}
 */
export function formatRelativeTime(ts) {
  if (!ts) return ''
  const timestamp = typeof ts === 'string' ? parseInt(ts, 10) : ts
  if (isNaN(timestamp) || timestamp === 0) return ''

  const now = Date.now()
  const diff = now - timestamp

  if (diff < 0) return formatAbsoluteTime(timestamp)

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`

  if (days === 1) {
    const date = new Date(timestamp)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `昨天 ${hh}:${mm}`
  }

  if (days === 2) {
    const date = new Date(timestamp)
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `前天 ${hh}:${mm}`
  }

  return formatAbsoluteTime(timestamp)
}

function formatAbsoluteTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  if (y !== now.getFullYear()) {
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
  return `${m}-${d} ${hh}:${mm}`
}

export function getRefreshInterval(ts) {
  if (!ts) return 0
  const timestamp = typeof ts === 'string' ? parseInt(ts, 10) : ts
  const diff = Date.now() - timestamp
  if (diff < 60000) return 10000
  if (diff < 3600000) return 60000
  return 0
}
