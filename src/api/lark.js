import { LARK_CONFIG, TABLE_IDS } from '../config/lark.js'
import { getCachedData, setCachedData } from '../utils/cache.js'

const BASE_URL = 'https://open.feishu.cn/open-apis'

let token = ''
let tokenExpiry = 0

async function request(apiPath, method = 'GET', data = {}) {
  const accessToken = await getAccessToken()

  return new Promise((resolve, reject) => {
    const header = {
      Authorization: `Bearer ${accessToken}`
    }
    if (method !== 'GET') {
      header['Content-Type'] = 'application/json'
    }

    const actualMethod = method === 'PATCH' ? 'PUT' : method
    const trimmedPath = (apiPath || '').trim()

    uni.request({
      url: `${BASE_URL}${trimmedPath}`,
      method: actualMethod,
      header,
      data: method === 'PUT' || method === 'POST' ? JSON.stringify(data) : data,
      success: (res) => {
        let result = res.data
        if (typeof result === 'string') {
          try { result = JSON.parse(result) } catch { result = null }
        }

        if (result && result.code === 0) {
          resolve(result.data)
        } else {
          reject(
            new Error(
              `飞书API错误: ${result?.code ?? 'N/A'} - ${result?.msg ?? '未知错误'} (HTTP ${res.statusCode})`
            )
          )
        }
      },
      fail: (err) => reject(new Error(`网络请求失败: ${err.errMsg || JSON.stringify(err)}`))
    })
  })
}

async function getAccessToken() {
  if (token && Date.now() < tokenExpiry) {
    return token
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}/auth/v3/tenant_access_token/internal`,
      method: 'POST',
      data: {
        app_id: LARK_CONFIG.appId,
        app_secret: LARK_CONFIG.appSecret
      },
      success: (res) => {
        if (res.data.code === 0 && res.data.tenant_access_token) {
          token = res.data.tenant_access_token
          tokenExpiry = Date.now() + 1000 * (res.data.expire - 300)
          resolve(token)
        } else {
          reject(new Error('获取飞书令牌失败: ' + JSON.stringify(res.data)))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

async function fetchAllRecords(tableId, pageSize = 500) {
  let pageToken
  let allRecords = []

  while (true) {
    const params = { page_size: pageSize }
    if (pageToken) params.page_token = pageToken

    const result = await request(
      `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${tableId}/records`,
      'GET',
      params
    )

    const items = result.items || []
    allRecords = allRecords.concat(items)

    pageToken = result.page_token
    if (!result.has_more) break

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return allRecords
}

export async function getProducts(pageSize = 500, forceRefresh = false) {
  const cacheKey = 'lark_products'
  const cached = getCachedData(cacheKey)

  if (cached && Array.isArray(cached) && cached.length > 0 && (cached[0].fields || cached[0].record_id)) {
    if (!forceRefresh) return cached
  }

  if (cached && !cached[0]?.fields) {
    uni.removeStorageSync(cacheKey)
  }

  try {
    const records = await fetchAllRecords(TABLE_IDS.products, pageSize)
    if (records.length > 0) {
      setCachedData(cacheKey, records)
    }
    return records
  } catch (err) {
    if (err.message.includes('InvalidPageToken')) {
      token = ''
      tokenExpiry = 0
      const records = await fetchAllRecords(TABLE_IDS.products, pageSize)
      if (records.length > 0) {
        setCachedData(cacheKey, records)
      }
      return records
    }
    throw err
  }
}

export async function getCategories() {
  const cacheKey = 'lark_categories'
  const cached = getCachedData(cacheKey)
  if (cached && cached.length > 0) return cached

  try {
    const records = await fetchAllRecords(TABLE_IDS.categories)
    if (records.length > 0) {
      setCachedData(cacheKey, records)
    }
    return records
  } catch {
    return []
  }
}

export async function getCategoryDetails(cateId) {
  const all = await fetchAllRecords(TABLE_IDS.categoryDets)
  return all.filter(r => r.fields?.cate_id === cateId || r.fields?.cateId === cateId)
}

export async function getCreators() {
  const cacheKey = 'lark_creators'
  const cached = getCachedData(cacheKey)
  if (cached && cached.length > 0) return cached

  try {
    const records = await fetchAllRecords(TABLE_IDS.creators)
    if (records.length > 0) {
      setCachedData(cacheKey, records)
    }
    return records
  } catch {
    return []
  }
}

export async function getComments(productId) {
  const records = await fetchAllRecords(TABLE_IDS.comments)
  return records.filter(r => {
    const fields = r.fields
    return fields?.product_id === productId || fields?.productId === productId
  })
}

export async function getCommentsCount() {
  const records = await fetchAllRecords(TABLE_IDS.comments)
  const counts = {}
  records.forEach(r => {
    const id = r.fields?.product_id || r.fields?.productId
    if (id) counts[id] = (counts[id] || 0) + 1
  })
  return counts
}

export async function addComment(comment) {
  const record = {
    fields: {
      product_id: parseInt(comment.productId) || 0,
      user_id: parseInt(comment.userId) || 0,
      user_name: comment.userName || '匿名用户',
      user_avatar: comment.userAvatar || '',
      content: comment.content || '',
      images: JSON.stringify(comment.images || []),
      time: comment.createdAt || new Date().toISOString(),
      para_id: parseInt(comment.parentId) || 0
    }
  }

  return request(
    `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${TABLE_IDS.comments}/records`,
    'POST',
    record
  )
}

export async function likeComment(commentId) {
  const records = await getComments()
  const target = records.find(r => r.fields?.ID === commentId || r.record_id === commentId)

  if (!target) return null

  const currentLikes = parseInt(target.fields?.likes || '0')
  const record = {
    fields: {
      ...target.fields,
      likes: currentLikes + 1
    }
  }

  return request(
    `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${TABLE_IDS.comments}/records/${target.record_id}`,
    'PUT',
    record
  )
}

export async function updateProductStats(productId, stats) {
  const products = await getProducts()
  const target = products.find(r => r.fields?.id === productId || r.fields?.text === productId)

  if (!target) return null

  const record = {
    fields: {
      ...target.fields,
      ...stats
    }
  }

  return request(
    `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${TABLE_IDS.products}/records/${target.record_id}`,
    'PUT',
    record
  )
}
