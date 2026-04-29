import crypto from 'crypto'

class SimpleCache {
  constructor(ttl = 3600000) {
    this.cache = new Map()
    this.ttl = ttl
  }
  
  generateKey(content) {
    return crypto.createHash('md5').update(content).digest('hex')
  }
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }
  
  set(key, value, customTtl) {
    const ttl = customTtl || this.ttl
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    })
  }
  
  has(key) {
    return this.get(key) !== null
  }
  
  delete(key) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
  }
  
  size() {
    return this.cache.size
  }
  
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

export const webpageCache = new SimpleCache(1800000)

export const aiFormatCache = new SimpleCache(3600000)

export const getCacheKey = (...parts) => {
  return crypto.createHash('md5').update(parts.join('|')).digest('hex')
}

setInterval(() => {
  webpageCache.cleanup()
  aiFormatCache.cleanup()
}, 300000)
