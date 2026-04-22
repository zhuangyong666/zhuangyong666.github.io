import { ref, reactive, computed, watch } from 'vue'

const ENTRIES_KEY = 'diary-entries'
const GH_CONFIG_KEY = 'diary-gh-config'

// ===== IndexedDB for Media =====

const DB_NAME = 'diary-media'
const DB_VERSION = 1
const STORE_NAME = 'media'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

async function idbStore(base64, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id, data: base64, ts: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

async function idbGet(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result?.data || null)
    req.onerror = (e) => reject(e.target.error)
  })
}

async function idbDelete(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

async function idbKeys() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAllKeys()
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// In-memory cache for fast reads (used in sync contexts like computed)
const _mediaCache = new Map()

async function _cacheAll() {
  _mediaCache.clear()
  const keys = await idbKeys()
  for (const key of keys) {
    const data = await idbGet(key)
    _mediaCache.set(key, data)
  }
}

function _cachePut(id, data) {
  _mediaCache.set(id, data)
}

function _cacheDel(id) {
  _mediaCache.delete(id)
}

// ===== Local Storage (entries only) =====

function loadLocal() {
  try {
    const d = localStorage.getItem(ENTRIES_KEY)
    return d ? JSON.parse(d) : []
  } catch { return [] }
}

function saveLocal(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ===== Media (IndexedDB) =====

async function storeMedia(base64) {
  const id = genId()
  try {
    await idbStore(base64, id)
    return `media://${id}`
  } catch { return base64 }
}

function getMedia(ref) {
  if (!ref) return null
  if (ref.startsWith('media://')) {
    // Fast path: in-memory cache
    const cached = _mediaCache.get(ref.replace('media://', ''))
    if (cached) return cached
    // Slow path: read from IndexedDB directly
    return null
  }
  return ref.startsWith('data:') ? ref : null
}

async function delMedia(ref) {
  if (ref?.startsWith('media://')) {
    const id = ref.replace('media://', '')
    _cacheDel(id)
    await idbDelete(id)
  }
}

function extractMediaRefs(content) {
  return [...new Set((content || '').match(/media:\/\/[a-z0-9]+/g) || [])]
}

async function delEntryMedia(content) {
  for (const ref of extractMediaRefs(content)) {
    await delMedia(ref)
  }
}

// ===== GitHub API =====

function ghHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}

async function ghFetch(cfg, method, path, body = null) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`
  const res = await fetch(url, {
    method,
    headers: body ? { ...ghHeaders(cfg.token), 'Content-Type': 'application/json' } : ghHeaders(cfg.token),
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 404) return { status: 404 }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `${res.status}`)
  }
  return { status: res.status, data: await res.json() }
}

async function ghGet(cfg, path) {
  const r = await ghFetch(cfg, 'GET', path)
  if (r.status === 404) return null
  const text = atob(r.data.content.replace(/\n/g, ''))
  return { content: text, sha: r.data.sha }
}

async function ghPut(cfg, path, content, sha = null, raw = false) {
  const encoded = raw ? content : btoa(unescape(encodeURIComponent(content)))
  return ghFetch(cfg, 'PUT', path, {
    message: `chore(diary): ${path}`,
    content: encoded,
    branch: cfg.branch || 'main',
    ...(sha ? { sha } : {})
  })
}

async function ghDelete(cfg, path, sha) {
  return ghFetch(cfg, 'DELETE', `${path}?sha=${sha}&branch=${cfg.branch || 'main'}`)
}

// ===== Store =====

const entries = reactive(loadLocal())

function loadGhConfig() {
  try { return JSON.parse(localStorage.getItem(GH_CONFIG_KEY)) } catch { return null }
}

const githubConfig = ref(loadGhConfig())
const syncing = ref(false)
const syncError = ref(null)
const syncProgress = ref({ current: 0, total: 0, message: '' })

const allEntries = computed(() => [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)))

function getById(id) { return entries.find(e => e.id === id) || null }

function create(entry) {
  const e = {
    id: genId(),
    date: entry.date || new Date().toISOString().split('T')[0],
    title: entry.title || '',
    content: entry.content || '',
    mood: entry.mood || '',
    tags: entry.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAI: entry.isAI || false
  }
  entries.push(e)
  saveLocal(entries)
  return e
}

async function update(id, updates) {
  const i = entries.findIndex(e => e.id === id)
  if (i === -1) return null
  const old = entries[i]
  if (updates.content && updates.content !== old.content) await delEntryMedia(old.content)
  entries[i] = { ...old, ...updates, updatedAt: new Date().toISOString() }
  saveLocal(entries)
  return entries[i]
}

async function remove(id) {
  const i = entries.findIndex(e => e.id === id)
  if (i === -1) return false
  await delEntryMedia(entries[i].content)
  entries.splice(i, 1)
  saveLocal(entries)
  return true
}

async function handleFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = async (e) => {
      try {
        const ref = await storeMedia(e.target.result)
        // Also cache in memory for immediate reads
        const id = ref.startsWith('media://') ? ref.replace('media://', '') : null
        if (id) _cachePut(id, e.target.result)
        resolve(ref)
      } catch (err) { reject(err) }
    }
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function resolveMedia(content) {
  if (!content) return ''
  return content.replace(/media:\/\/[a-z0-9]+/g, m => getMedia(m) || m)
}

// Load media cache at startup
_cacheAll().catch(() => {})

// ===== GitHub Sync =====

async function syncEntry(entry) {
  if (!githubConfig.value) return
  const cfg = githubConfig.value
  try {
    // Save entry JSON
    const path = `diary/entries/${entry.id}.json`
    const existing = await ghGet(cfg, path)
    await ghPut(cfg, path, JSON.stringify(entry, null, 2), existing?.sha)

    // Save media from IndexedDB
    for (const ref of extractMediaRefs(entry.content)) {
      const id = ref.replace('media://', '')
      const data = await idbGet(id)
      if (data?.startsWith('data:')) {
        const mPath = `diary/media/${id}`
        const mExisting = await ghGet(cfg, mPath)
        if (!mExisting) {
          await ghPut(cfg, mPath, data.split(',')[1], null, true)
        }
      }
    }

    // Update index
    await updateIndex()
  } catch (e) {
    console.warn('GitHub sync failed:', e)
    syncError.value = e.message
  }
}

async function deleteFromGh(entry) {
  if (!githubConfig.value) return
  const cfg = githubConfig.value
  try {
    const existing = await ghGet(cfg, `diary/entries/${entry.id}.json`)
    if (existing) await ghDelete(cfg, `diary/entries/${entry.id}.json`, existing.sha)
    await updateIndex()
  } catch (e) { console.warn('GitHub delete failed:', e) }
}

async function updateIndex() {
  if (!githubConfig.value) return
  const cfg = githubConfig.value
  const idx = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    count: entries.length,
    entries: entries.map(e => ({ id: e.id, date: e.date, title: e.title, mood: e.mood, tags: e.tags, isAI: e.isAI, createdAt: e.createdAt, updatedAt: e.updatedAt }))
  }
  const existing = await ghGet(cfg, 'diary/index.json')
  await ghPut(cfg, 'diary/index.json', JSON.stringify(idx, null, 2), existing?.sha)
}

async function loadFromGitHub() {
  if (!githubConfig.value) return false
  const cfg = githubConfig.value
  syncing.value = true
  syncError.value = null

  try {
    const indexFile = await ghGet(cfg, 'diary/index.json')
    if (!indexFile) { syncProgress.value.message = 'GitHub 上没有数据'; return false }

    const metas = JSON.parse(indexFile.content).entries || []
    syncProgress.value = { current: 0, total: metas.length, message: '正在加载...' }

    const loaded = []
    for (let i = 0; i < metas.length; i++) {
      const f = await ghGet(cfg, `diary/entries/${metas[i].id}.json`)
      if (f) loaded.push(JSON.parse(f.content))
      syncProgress.value = { current: i + 1, total: metas.length, message: `已加载 ${i + 1}/${metas.length}` }
    }

    // Load media into IndexedDB
    const mediaIds = new Set()
    loaded.forEach(e => extractMediaRefs(e.content).forEach(r => mediaIds.add(r.replace('media://', ''))))
    for (const id of mediaIds) {
      const f = await ghGet(cfg, `diary/media/${id}`)
      if (f) {
        const dataUrl = f.content.startsWith('data:') ? f.content : `data:application/octet-stream;base64,${f.content}`
        await idbStore(dataUrl, id)
        _cachePut(id, dataUrl)
      }
    }

    entries.length = 0
    loaded.forEach(e => entries.push(e))
    saveLocal(entries)

    syncProgress.value = { current: loaded.length, total: metas.length, message: `加载完成! ${loaded.length} 篇` }
    return true
  } catch (e) {
    syncError.value = e.message
    return false
  } finally { syncing.value = false }
}

// Auto-sync on change (debounced)
let _saveTimer = null
watch(entries, () => {
  if (!githubConfig.value) return
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => updateIndex().catch(() => {}), 2000)
}, { deep: true })

// ===== Exports =====

function setConfig(cfg) {
  githubConfig.value = cfg
  localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(cfg))
}

function clearConfig() {
  githubConfig.value = null
  localStorage.removeItem(GH_CONFIG_KEY)
}

export function useDiary() {
  return {
    allEntries, getById, create, update, remove,
    handleFile, resolveMedia,
    githubConfig, syncing, syncError, syncProgress,
    setConfig, clearConfig,
    loadFromGitHub, syncEntry, deleteFromGh, updateIndex
  }
}
