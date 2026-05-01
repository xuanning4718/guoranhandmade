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
  updateProductStats as larkUpdateProductStats
} from './lark.js'
import { mapProduct, mapCategory, mapCategoryDetail, mapCreator, mapComment } from '../utils/larkMapper.js'
import { convertCloudImages } from '../utils/cloudImage.js'

const { products: mockProducts, categories: mockCategories, categoryDetails: mockCategoryDetails, creators: mockCreators, comments: mockComments, banners: mockBanners } = mockData

function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getBanners() {
  return { code: 0, data: mockBanners }
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
  const details = mockCategoryDetails.filter(d => d.cateId === cateId)
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
      result = result.filter(p => p.categoryId === query.category)
    }
    if (query.detId) {
      result = result.filter(p => p.detId === query.detId)
    }
    if (query.creatorId) {
      result = result.filter(p => p.creatorId === query.creatorId)
    }
    if (query.keyword) {
      const kw = query.keyword.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(kw) ||
        p.tags.some(t => t.toLowerCase().includes(kw))
      )
    }

    if (query.sort === 'hot') {
      result.sort((a, b) => {
        const scoreA = 3 * (a.favorites || 0) + 5 * (a.comments || 0) + (a.views || 0)
        const scoreB = 3 * (b.favorites || 0) + 5 * (b.comments || 0) + (b.views || 0)
        return scoreB - scoreA
      })
    } else if (query.sort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else {
      result.sort((a, b) => b.sortOrder - a.sortOrder)
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
  return getProducts({ sort: 'hot', pageSize: 20 })
}

export async function getNewProducts() {
  return getProducts({ sort: 'newest', pageSize: 20 })
}

export async function getProductById(id) {
  try {
    const products = await larkGetProducts()
    const record = products.find(r => {
      const fields = r.fields
      return fields?.id === id || fields?.text === String(id)
    })

    if (!record) throw new Error('Product not found')

    const product = mapProduct(record.fields)
    product.images = await convertCloudImages(product.images)

    const creators = await larkGetCreators()
    const creatorRecord = creators.find(r => r.fields?.id === product.creatorId || r.fields?.name && product.creatorId > 0)
    const creator = creatorRecord ? mapCreator(creatorRecord.fields, 0, []) : null

    return { code: 0, data: product, creator }
  } catch {
    const product = mockProducts.find(p => p.id === id)
    if (!product) throw new Error('Product not found')

    const creator = mockCreators.find(c => c.id === product.creatorId)
    return { code: 0, data: product, creator }
  }
}

export async function getCreatorById(id) {
  try {
    const records = await larkGetCreators()
    const record = records.find(r => r.fields?.id === id || r.fields?.name && id > 0)

    if (!record) throw new Error('Creator not found')

    const products = await larkGetProducts()
    const creator = mapCreator(record.fields, 0, products.map(p => mapProduct(p.fields)))
    creator.images = await convertCloudImages(creator.images)

    return { code: 0, data: creator }
  } catch {
    const creator = mockCreators.find(c => c.id === id)
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

    const replies = {}
    comments.forEach(c => {
      if (c.parentId && c.parentId > 0) {
        if (!replies[c.parentId]) replies[c.parentId] = []
        replies[c.parentId].push(c)
      }
    })

    const rootComments = comments.filter(c => !c.parentId || c.parentId === 0)
    rootComments.forEach(c => {
      c.replies = replies[c.id] || []
    })

    return { code: 0, data: rootComments }
  } catch {
    return getCommentsFallback(productId)
  }
}

export async function addComment(comment) {
  try {
    return await larkAddComment(comment)
  } catch {
    return { success: true }
  }
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
