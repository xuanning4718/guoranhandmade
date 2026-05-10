import { LARK_CONFIG, TABLE_IDS } from '../config/lark.js'
import { getCachedData, setCachedData } from '../utils/cache.js'
import { mapBanner } from '../utils/larkMapper.js'

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
    const params = { page_size: pageSize, field_map: 'value' }
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
  return all.filter(r => {
    const fields = r.fields
    const fieldCateId = parseInt(fields?.cateId || fields?.cate_id || fields?.CATE_ID || '0')
    return fieldCateId === cateId
  })
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
  const all = await fetchAllRecords(TABLE_IDS.comments)
  
  if (productId === undefined || productId === null || productId === '') {
    return []
  }
  
  return all.filter(r => {
    const fields = r.fields
    const recordProductId = fields?.product_id ?? fields?.productId
    return parseInt(recordProductId) === parseInt(productId)
  })
}

async function fetchComments() {
  return await fetchAllRecords(TABLE_IDS.comments)
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
      product_id: comment.productId ? parseInt(comment.productId) : 0,
      user_id: comment.userId ? parseInt(comment.userId) : 0,
      user_name: comment.userName || '匿名用户',
      user_avatar: comment.userAvatar || '',
      content: comment.content || '',
      likes: 0,
      time: new Date(comment.createdAt || Date.now()).getTime()
    }
  }

  if (comment.parentId && comment.parentId !== '0' && comment.parentId !== 0) {
    record.fields.parent_id = parseInt(comment.parentId)
  }

  return request(
    `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${TABLE_IDS.comments}/records`,
    'POST',
    record
  )
}

export async function likeComment(commentId) {
  try {
    const records = await fetchComments()
    if (records.length === 0) {
      return null
    }

    const commentIdStr = String(commentId).replace(/^0+/, '')

    const target = records.find(r => {
      const rawId = r.fields?.ID || ''
      const normalizedId = String(rawId).replace(/\D/g, '').replace(/^0+/, '') || '0'
      const isRecordId = r.record_id === commentIdStr
      const isFieldId = normalizedId === commentIdStr
      return isRecordId || isFieldId
    })

    if (!target) {
      return null
    }

    const rawLikes = target.fields?.likes
    const currentLikes = rawLikes && typeof rawLikes === 'object'
      ? parseInt(rawLikes.text || '0')
      : parseInt(rawLikes || '0')
    const newLikes = currentLikes + 1
    const record = {
      fields: {
        likes: newLikes
      }
    }

    return request(
      `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${TABLE_IDS.comments}/records/${target.record_id}`,
      'PUT',
      record
    )
  } catch (e) {
    console.error('[lark] likeComment error:', e)
    return null
  }
}

export async function updateProductStats(productId, stats) {
  const numProductId = parseInt(productId)

  const products = await getProducts(500, true)

  const target = products.find(r => {
    const fid = parseInt(r.fields?.id)
    return fid === numProductId
  })

  if (!target) {
    console.error('[lark] Product not found in bitable for id:', numProductId)
    return null
  }

  // Only send the fields that changed (PATCH-like behavior using PUT)
  const payload = {}
  for (const [key, value] of Object.entries(stats)) {
    payload[key] = parseInt(value) || 0
  }

  const result = await request(
    `/bitable/v1/apps/${LARK_CONFIG.appToken}/tables/${TABLE_IDS.products}/records/${target.record_id}`,
    'PUT',
    { fields: payload }
  )

  uni.removeStorageSync('lark_products')
  return result
}

export async function getBanners() {
  const cacheKey = 'lark_banners'
  const cached = getCachedData(cacheKey)
  if (cached && cached.length > 0) return cached

  try {
    const records = await fetchAllRecords(TABLE_IDS.banners)
    const mapped = records.map(r => mapBanner(r.fields))
    if (mapped.length > 0) {
      setCachedData(cacheKey, mapped)
    }
    return mapped
  } catch {
    return []
  }
}

export async function getHotKeywords(forceRefresh = false) {
  const cacheKey = 'lark_hot_keywords'
  const cached = getCachedData(cacheKey)
  if (cached && !forceRefresh) return cached
  
  const defaultKeywords = ['冰箱贴', '旅行图册', '手抄报', '鹅卵石']
  
  try {
    const records = await fetchAllRecords(TABLE_IDS.params)
    const hotRecord = records.find(r => r.fields?.['参数'] === '热门搜索')
    
    if (!hotRecord) return defaultKeywords
    
    const keywordsStr = hotRecord.fields?.['参数_文本'] || ''
    const keywords = keywordsStr 
      ? keywordsStr.split(',').map(k => k.trim()).filter(k => k) 
      : []
    
    if (keywords.length > 0) {
      setCachedData(cacheKey, keywords)
      return keywords
    }
    
    return defaultKeywords
  } catch (err) {
    console.warn('获取热门搜索关键词失败，使用默认值:', err.message)
    return defaultKeywords
  }
}

export async function getCommentEnabled(forceRefresh = false) {
  const cacheKey = 'lark_comment_enabled'
  const cached = getCachedData(cacheKey)
  if (cached !== null && !forceRefresh) return cached
  
  try {
    const records = await fetchAllRecords(TABLE_IDS.params)
    const commentRecord = records.find(r => {
      const paramName = r.fields?.['参数']
      return paramName !== undefined && paramName !== null && paramName.toString().trim() === '是否开启作品评论'
    })
    
    let enabled = true
    if (commentRecord) {
      const paramVal = commentRecord.fields?.['参数值']
      enabled = paramVal === 1 || paramVal === '1'
    }
    
    setCachedData(cacheKey, enabled)
    return enabled
  } catch (err) {
    console.warn('[lark] getCommentEnabled failed, defaulting to true:', err.message)
    return true
  }
}
