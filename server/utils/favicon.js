import fs from 'fs'
import path from 'path'

export async function generateFavicon(url) {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    return `https://favicon.im/${hostname}?larger=true`
  } catch {
    return ''
  }
}

export async function generateAppIcon(name) {
  return ''
}
