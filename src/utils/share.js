import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

export const SHARE_CONFIG = {
  appTitle: '菓然手作',
  defaultImagePath: '/static/images/guoran.jpg',
  baseUrl: '/pages/index/index'
}

export function getProductShareTitle(product, creator) {
  if (!product) return SHARE_CONFIG.appTitle
  const parts = [product.title]
  if (creator?.name) {
    parts.push(creator.name)
  }
  return parts.join(' - ')
}

export function getProductSharePath(productId) {
  return `/pages/product/product?id=${productId}`
}

export function getProductShareImage(product) {
  if (product?.images?.length > 0) {
    return product.images[0]
  }
  return SHARE_CONFIG.defaultImagePath
}

export function useProductShare(product, creator, productId) {
  const getShareData = () => ({
    title: getProductShareTitle(product?.value, creator?.value),
    path: getProductSharePath(productId?.value),
    imageUrl: getProductShareImage(product?.value)
  })

  onShareAppMessage(() => {
    const data = getShareData()
    return {
      title: data.title,
      path: data.path,
      imageUrl: data.imageUrl
    }
  })

  onShareTimeline(() => {
    const data = getShareData()
    return {
      title: data.title,
      imageUrl: data.imageUrl
    }
  })
}
