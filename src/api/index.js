import { mockData } from './mockData.js'
import {
  getProducts as larkGetProducts,
  getCategories as larkGetCategories,
  getCategoryDetails as larkGetCategoryDetails,
  getCreators as larkGetCreators,
  getComments as larkGetComments,
  getCommentsCount,
  addComment as larkAddComment,
  likeComment as larkLikeComment,
  updateProductStats as larkUpdateProductStats,
  getBanners as larkGetBanners,
  getCommentEnabled as larkGetCommentEnabled,
  getHotKeywords as larkGetHotKeywords
} from './lark.js'
import { mapProduct, mapCategory, mapCategoryDetail, mapCreator, mapComment } from '../utils/larkMapper.js'
import { convertCloudImages } from '../utils/cloudImage.js'

const { products: mockProducts, categories: mockCategories, categoryDetails: mockCategoryDetails, creators: mockCreators, comments: mockComments, banners: mockBanners } = mockData

function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getBanners() {
  try {
    const records = await larkGetBanners()
    const enabledBanners = records.filter(b => b.enabled)

    const imageUrls = enabledBanners.filter(b => b.image?.startsWith('cloud://')).map(b => b.image)
    if (imageUrls.length > 0) {
      const converted = await convertCloudImages(imageUrls)
      let idx = 0
      enabledBanners.forEach(b => {
        if (b.image?.startsWith('cloud://')) {
          b.image = converted[idx] || b.image
          idx++
        }
      })
    }

    enabledBanners.sort((a, b) => a.sortOrder - b.sortOrder)
    return { code: 0, data: enabledBanners }
  } catch (err) {
    console.warn('飞书Banner失败，降级:', err.message)
    return { code: 0, data: mockBanners }
  }
}

async function getProductsFallback(query = {}) {
  let products = [...mockProducts]

  if (query.category) {
    products = products.filter(p => p.category === query.category)
  }
  if (query.detId) {
    products = products.filter(p => p.detId === query.detId)
  }
  if (query.creatorId) {
    products = products.filter(p => p.creatorId === query.creatorId)
  }
  if (query.keyword) {
    const kw = query.keyword.toLowerCase()
    products = products.filter(p =>
      p.title.toLowerCase().includes(kw) ||
      p.tags.some(t => t.toLowerCase().includes(kw))
    )
  }

  if (query.sort === 'sales') {
    products.sort((a, b) => b.sales - a.sales)
  } else if (query.sort === 'newest') {
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  if (query.page && query.pageSize) {
    const start = (query.page - 1) * query.pageSize
    products = products.slice(start, start + query.pageSize)
  }

  return { code: 0, data: products }
}

async function getCategoriesFallback() {
  return { code: 0, data: mockCategories }
}

async function getCategoryDetailsFallback(cateId) {
  const numId = typeof cateId === 'string' ? parseInt(cateId) : cateId
  const details = mockCategoryDetails.filter(d => d.cateId === numId)
  return { code: 0, data: details }
}

async function getCreatorsFallback() {
  return { code: 0, data: mockCreators }
}

async function getCommentsFallback(productId) {
  const comments = mockComments[productId] || []
  return { code: 0, data: comments }
}

export async function getProducts(query = {}) {
  try {
    const [records, commentCounts] = await Promise.all([
      larkGetProducts(),
      getCommentsCount()
    ])

    const filtered = records
      .filter(r => r.fields && r.fields.status === '上架')
      .map(r => {
        const product = mapProduct(r.fields)
        product.comments = commentCounts[product.id] || 0
        return product
      })

    let result = filtered

    if (query.category) {
      const catId = typeof query.category === 'string' ? parseInt(query.category) : query.category
      result = result.filter(p => p.category === catId)
    }
    if (query.detId) {
      const detId = typeof query.detId === 'string' ? parseInt(query.detId) : query.detId
      result = result.filter(p => p.detId === detId)
    }
    if (query.creatorId) {
      const cId = typeof query.creatorId === 'string' ? parseInt(query.creatorId) : query.creatorId
      result = result.filter(p => p.creatorId === cId)
    }
    if (query.keyword) {
      const kw = query.keyword.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(kw) ||
        p.tags.some(t => t.toLowerCase().includes(kw))
      )
    }

    if (query.sort === 'sales') {
      result.sort((a, b) => (b.comments || 0) - (a.comments || 0))
    } else if (query.sort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else {
      result.sort((a, b) => (b.favorites || 0) - (a.favorites || 0))
    }

    for (const p of result) {
      p.images = await convertCloudImages(p.images)
    }

    if (query.page && query.pageSize) {
      const start = (query.page - 1) * query.pageSize
      result = result.slice(start, start + query.pageSize)
    }

    return { code: 0, data: result }
  } catch (err) {
    console.warn('飞书API失败，降级到本地:', err.message)
    return getProductsFallback(query)
  }
}

export async function getHotProducts() {
  return getProducts({ sort: 'hot', pageSize: 12 })
}

export async function getNewProducts() {
  return getProducts({ sort: 'newest', pageSize: 12 })
}

export async function getProductById(id) {
  const numId = typeof id === 'string' ? parseInt(id) : id
  try {
    const [records, creators] = await Promise.all([
      larkGetProducts(),
      larkGetCreators()
    ])

    const mapped = records
      .filter(r => r.fields && r.fields.status === '上架')
      .map(r => mapProduct(r.fields))

    const product = mapped.find(p => p.id === numId)
    if (!product) throw new Error('Product not found')

    product.images = await convertCloudImages(product.images)

    const creatorRecord = creators.find(r => {
      const fields = r.fields
      const creatorId = parseInt(fields?.id || '0')
      return creatorId === product.creatorId
    })
    const creator = creatorRecord ? mapCreator(creatorRecord.fields, 0, []) : null

    return { code: 0, data: product, creator }
  } catch {
    const product = mockProducts.find(p => p.id === numId)
    if (!product) throw new Error('Product not found')

    const creator = mockCreators.find(c => c.id === product.creatorId)
    return { code: 0, data: product, creator }
  }
}

export async function getCreatorById(id) {
  const numId = typeof id === 'string' ? parseInt(id) : id
  try {
    const records = await larkGetCreators()
    if (numId < 1 || numId > records.length) throw new Error('Creator not found')

    const record = records[numId - 1]
    const products = await larkGetProducts()
    const creator = mapCreator(record.fields, numId - 1, products.map(p => mapProduct(p.fields)))
    creator.images = await convertCloudImages(creator.images)

    return { code: 0, data: creator }
  } catch {
    const numId = typeof id === 'string' ? parseInt(id) : id
    const creator = mockCreators.find(c => c.id === numId)
    if (!creator) throw new Error('Creator not found')
    return { code: 0, data: creator }
  }
}

export async function getCategories() {
  try {
    const records = await larkGetCategories()
    const categories = records.map(r => mapCategory(r.fields))
    return { code: 0, data: categories }
  } catch {
    return getCategoriesFallback()
  }
}

export async function getCategoryDetails(cateId) {
  try {
    const records = await larkGetCategoryDetails(cateId)
    const details = records.map(r => mapCategoryDetail(r.fields))
    return { code: 0, data: details }
  } catch {
    return getCategoryDetailsFallback(cateId)
  }
}

export async function getCreators() {
  try {
    const records = await larkGetCreators()
    const products = await larkGetProducts()
    const mappedProducts = products.map(p => mapProduct(p.fields))

    const creators = records.map((r, idx) =>
      mapCreator(r.fields, idx, mappedProducts)
    )

    return { code: 0, data: creators }
  } catch {
    return getCreatorsFallback()
  }
}

export async function getComments(productId) {
  try {
    const records = await larkGetComments(productId)
    const comments = records.map(r => mapComment(r.fields, r.record_id))

    // Convert user avatars (cloud:// URLs)
    const avatarUrls = comments.filter(c => c.userAvatar?.startsWith('cloud://')).map(c => c.userAvatar)
    if (avatarUrls.length > 0) {
      const convertedAvatars = await convertCloudImages(avatarUrls)
      comments.filter(c => c.userAvatar?.startsWith('cloud://')).forEach((c, idx) => {
        c.userAvatar = convertedAvatars[idx] || c.userAvatar
      })
    }

    const replies = {}
    comments.forEach(c => {
      const pid = String(c.parentId || '')
      if (pid && pid !== '0') {
        if (!replies[pid]) replies[pid] = []
        replies[pid].push(c)
      }
    })

    return { code: 0, data: comments }
  } catch {
    return getCommentsFallback(productId)
  }
}

export async function addComment(comment) {
  return await larkAddComment(comment)
}

export async function likeComment(commentId) {
  try {
    return await larkLikeComment(commentId)
  } catch {
    return { success: true }
  }
}

export async function updateProductStats(productId, stats) {
  try {
    return await larkUpdateProductStats(productId, stats)
  } catch {
    return { success: true }
  }
}

export async function getHotKeywords(forceRefresh = false) {
  try {
    const keywords = await larkGetHotKeywords(forceRefresh)
    return { code: 0, data: keywords }
  } catch {
    return { code: 0, data: ['冰箱贴', '旅行图册', '手抄报', '鹅卵石'] }
  }
}

export async function getCommentEnabled() {
  try {
    const enabled = await larkGetCommentEnabled()
    return { code: 0, data: enabled }
  } catch {
    return { code: 0, data: true }
  }
}
