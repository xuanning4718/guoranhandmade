import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

function persistWishlist(items) {
  uni.setStorageSync('wishlist', JSON.stringify(items))
}

function loadWishlist() {
  try {
    const data = uni.getStorageSync('wishlist')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref(loadWishlist())
  const totalCount = computed(() => items.value.length)

  function save() {
    persistWishlist(items.value)
  }

  function addItem(product) {
    const id = product.id !== undefined ? product.id : product.productId
    if (items.value.find(item => item.productId === id)) {
      return false
    }

    items.value.unshift({
      productId: id,
      title: product.title,
      image: product.images?.[0] || '',
      creatorId: product.creatorId,
      category: product.category,
      tags: product.tags || [],
      addedAt: new Date().toISOString().split('T')[0]
    })

    console.log('[wishlist] saved item:', JSON.stringify(items.value[0]))
    save()
    return true
  }

  function removeItem(productId) {
    items.value = items.value.filter(item => item.productId !== productId)
    save()
  }

  function isInWishlist(productId) {
    return items.value.some(item => item.productId === productId)
  }

  function clearWishlist() {
    items.value = []
    save()
  }

  return {
    items,
    totalCount,
    addItem,
    removeItem,
    isInWishlist,
    clearWishlist
  }
})
