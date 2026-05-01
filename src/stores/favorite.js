import { defineStore } from 'pinia'
import { ref } from 'vue'

function loadFavorites() {
  try {
    const data = uni.getStorageSync('favorites')
    if (data) {
      const parsed = JSON.parse(data)
      return {
        products: parsed.products || [],
        creators: parsed.creators || []
      }
    }
  } catch {}
  return { products: [], creators: [] }
}

function persistFavorites(products, creators) {
  uni.setStorageSync('favorites', JSON.stringify({
    products,
    creators
  }))
}

export const useFavoriteStore = defineStore('favorite', () => {
  const initial = loadFavorites()
  const favoriteProducts = ref(initial.products)
  const favoriteCreators = ref(initial.creators)

  function save() {
    persistFavorites(favoriteProducts.value, favoriteCreators.value)
  }

  function toggleProduct(productId) {
    const idx = favoriteProducts.value.indexOf(productId)
    if (idx > -1) {
      favoriteProducts.value.splice(idx, 1)
    } else {
      favoriteProducts.value.push(productId)
    }
    save()
    return idx === -1
  }

  function isProductFavorited(productId) {
    return favoriteProducts.value.includes(productId)
  }

  function toggleCreator(creatorId) {
    const idx = favoriteCreators.value.indexOf(creatorId)
    if (idx > -1) {
      favoriteCreators.value.splice(idx, 1)
    } else {
      favoriteCreators.value.push(creatorId)
    }
    save()
    return idx === -1
  }

  function isCreatorFavorited(creatorId) {
    return favoriteCreators.value.includes(creatorId)
  }

  return {
    favoriteProducts,
    favoriteCreators,
    toggleProduct,
    isProductFavorited,
    toggleCreator,
    isCreatorFavorited
  }
})
