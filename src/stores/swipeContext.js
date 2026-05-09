import { defineStore } from 'pinia'
import { ref } from 'vue'

const CACHE_TTL = 5 * 60 * 1000

export const useSwipeContextStore = defineStore('swipeContext', () => {
  const enabled = ref(false)
  const productList = ref([])
  const currentIndex = ref(0)
  const sourcePage = ref('')
  const sourceQuery = ref({})

  const cacheMap = new Map()

  function enterSwipeMode(list, index, source, query = {}) {
    productList.value = list
    currentIndex.value = index
    sourcePage.value = source
    sourceQuery.value = query
    enabled.value = true
    cacheMap.clear()
  }

  function exitSwipeMode() {
    enabled.value = false
    productList.value = []
    currentIndex.value = 0
    sourcePage.value = ''
    sourceQuery.value = {}
    cacheMap.clear()
  }

  function navigateTo(index) {
    if (index >= 0 && index < productList.value.length) {
      currentIndex.value = index
    }
  }

  function getCachedProduct(productId) {
    const entry = cacheMap.get(productId)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cacheMap.delete(productId)
      return null
    }
    return entry.data
  }

  function cacheProduct(productId, data) {
    cacheMap.set(productId, { data, timestamp: Date.now() })
  }

  function preloadNeighbors() {
    const idx = currentIndex.value
    preloadAt(idx - 1)
    preloadAt(idx + 1)
  }

  function preloadAt(index) {
    if (index < 0 || index >= productList.value.length) return
    const product = productList.value[index]
    if (cacheMap.has(product.id)) return
    // Trigger async preload — handled by immersive page
  }

  function getCurrentProduct() {
    return productList.value[currentIndex.value] || null
  }

  return {
    enabled,
    productList,
    currentIndex,
    sourcePage,
    sourceQuery,
    enterSwipeMode,
    exitSwipeMode,
    navigateTo,
    getCachedProduct,
    cacheProduct,
    preloadNeighbors,
    preloadAt,
    getCurrentProduct
  }
})
