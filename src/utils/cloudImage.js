const imageCache = new Map()

async function convertSingleCloudImage(url) {
  if (!url || !url.startsWith('cloud://')) return url

  console.log('[cloudImage] cloudPath:', url)

  if (imageCache.has(url)) {
    return imageCache.get(url)
  }

  try {
    const result = await wx.cloud.getTempFileURL({
      fileList: [url]
    })

    console.log('[cloudImage] API result:', JSON.stringify(result))

    if (result?.fileList?.[0]?.tempFileURL) {
      const tempUrl = result.fileList[0].tempFileURL
      imageCache.set(url, tempUrl)
      console.log('[cloudImage] SUCCESS, tempURL:', tempUrl)
      return tempUrl
    }

    console.warn(
      '[cloudImage] no tempFileURL, status:',
      result?.fileList?.[0]?.status,
      'errMsg:',
      result?.fileList?.[0]?.errMsg
    )
    return url
  } catch (e) {
    console.error('[cloudImage] error:', e)
    return url
  }
}

export async function convertCloudImages(urls) {
  if (!urls || !Array.isArray(urls)) return urls

  const results = await Promise.all(
    urls.map(url => {
      if (url && url.startsWith('cloud://')) {
        return convertSingleCloudImage(url)
      }
      return url
    })
  )
  return results.filter(Boolean)
}
