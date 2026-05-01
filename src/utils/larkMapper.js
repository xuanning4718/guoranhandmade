function parseArrayField(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return value.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  }
  return [value]
}

function getField(record, ...keys) {
  if (!record) return null
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }
  return null
}

function parseImageField(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      const urls = []
      const regex = /\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g
      let match
      while ((match = regex.exec(value)) !== null) {
        urls.push(match[2])
      }
      if (urls.length > 0) return urls

      return value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

export function mapProduct(record) {
  const rawImages = getField(record, 'images')

  const imageStrings = parseImageField(rawImages).map(img => {
    if (typeof img !== 'string') return null
    if (/^https?:\/\//.test(img)) return img
    const match = img.match(/\]\((https?:\/\/[^)]+)\)\s*(.+)$/)
    if (match) {
      return `${match[1]}${match[2].replace(/[\]"]*$/g, '').trim()}`
    }
    if (img) {
      const filename = img.split('/').pop()
      return `https://636c-cloud1-6geuw2dr3aa3bd50-1421195402.tcb.qcloud.la/GGHANDMADE/${filename}`
    }
    return null
  }).filter(Boolean)

  const detId = getField(record, 'det_id', 'DET_ID', 'Det_Id', 'detId')
  const rawTags = getField(record, 'tags', '标签')
  const tags = parseArrayField(rawTags)

  return {
    id: parseInt(getField(record, 'id', '文本') || '0'),
    title: getField(record, 'title', '名称') || '',
    description: getField(record, 'description', '描述') || '',
    images: imageStrings,
    tags,
    category: parseInt(getField(record, 'category_id', 'category', '分类') || '0'),
    detId: detId ? parseInt(detId) : null,
    creatorId: parseInt(getField(record, 'creator_id', 'creatorId') || '0'),
    price: parseFloat(getField(record, 'price', '价格') || '0'),
    views: parseInt(getField(record, 'views', '浏览数') || '0'),
    favorites: parseInt(getField(record, 'favorites', '收藏数') || '0'),
    sortOrder: parseInt(getField(record, 'sort_order', 'sortOrder') || '0'),
    createdAt: getField(record, 'created_at', 'createdAt') || ''
  }
}

export function mapCategory(record) {
  return {
    id: parseInt(getField(record, 'id', '文本') || '0'),
    name: getField(record, 'name') || '',
    icon: getField(record, 'icon') || '',
    color: getField(record, 'color') || '#E8E8E8',
    emoji: getField(record, 'icon') || '',
    sortOrder: parseInt(getField(record, 'sort_order') || '0')
  }
}

export function mapCategoryDetail(record) {
  return {
    cateId: parseInt(getField(record, 'cateId', 'cate_id', 'CATE_ID') || '0'),
    detId: parseInt(getField(record, 'detId', 'det_id', 'DET_ID') || '0'),
    detName: getField(record, 'detName', 'det_name', 'DET_NAME') || '',
    sortNo: parseInt(getField(record, 'sortNo', 'sort_no', 'SORT_NO') || '0')
  }
}

export function mapCreator(record, creatorCount = 0, products = []) {
  const id = creatorCount + 1
  const worksCount = products.filter(p => p.creatorId === id).length

  return {
    id,
    name: getField(record, 'name') || '',
    bio: getField(record, 'bio') || '',
    level: getField(record, 'level') || '新手',
    wechatQR: getField(record, 'webchat_images') || '',
    followers: parseInt(getField(record, 'followers') || '0'),
    location: getField(record, 'location') || '',
    worksCount
  }
}

export function mapComment(record, recordId = '') {
  return {
    id: parseInt(getField(record, 'ID') || '0'),
    recordId,
    productId: parseInt(getField(record, 'product_id') || '0'),
    userId: parseInt(getField(record, 'user_id') || '0'),
    userName: getField(record, 'user_name') || '匿名用户',
    userAvatar: getField(record, 'user_avatar') || '',
    content: getField(record, 'content') || '',
    images: parseImageField(getField(record, 'images')),
    likes: parseInt(getField(record, 'likes') || '0'),
    createdAt: getField(record, 'time') || '',
    parentId: parseInt(getField(record, 'para_id') || '0')
  }
}
