import { ref } from 'vue'

const STORAGE_KEY = 'diary-github-config'

function loadConfig() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

function githubHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}

export function useGitHubBackup() {
  const config = ref(loadConfig())
  const uploading = ref(false)
  const lastSync = ref(localStorage.getItem('diary-github-last-sync') || '')
  const uploadProgress = ref({ current: 0, total: 0, message: '' })
  const errors = ref([])

  function saveGitHubConfig(cfg) {
    config.value = cfg
    saveConfig(cfg)
  }

  function clearGitHubConfig() {
    config.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  async function checkRepo(token, owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}`
    const res = await fetch(url, {
      headers: githubHeaders(token)
    })
    if (res.status === 404) {
      return { exists: false, message: `仓库 ${owner}/${repo} 不存在，请先创建` }
    }
    if (res.status === 401) {
      return { exists: false, message: 'Token 无效或已过期，请检查' }
    }
    if (!res.ok) {
      const err = await res.json()
      return { exists: false, message: err.message || `检查仓库失败: ${res.status}` }
    }
    const data = await res.json()
    return { exists: true, message: `仓库: ${owner}/${repo} (${data.private ? '私有' : '公开'})` }
  }

  async function createOrUpdateFile(token, owner, repo, path, content, sha = null, branch = 'main') {
    const encoded = btoa(unescape(encodeURIComponent(content)))
    const body = {
      message: `chore(diary): backup ${new Date().toISOString()}`,
      content: encoded,
      branch
    }
    if (sha) body.sha = sha

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(url, {
      method: 'PUT',
      headers: githubHeaders(token),
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const err = await res.json()
      let msg = err.message || `上传失败: ${res.status}`
      if (msg.includes('Resource not accessible')) {
        msg = 'Token 权限不足。请使用 Classic Token（非 Fine-grained），并确保勾选了 repo 权限（Full control of private repositories）。'
      }
      throw new Error(msg)
    }
    return res.json()
  }

  async function getExistingFile(token, owner, repo, path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(url, {
      headers: githubHeaders(token)
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`检查文件失败: ${res.status}`)
    return res.json()
  }

  async function backupAll(entries, options = {}) {
    if (!config.value) throw new Error('未配置 GitHub 信息')
    const { token, owner, repo, branch = 'main' } = config.value

    uploading.value = true
    errors.value = []
    uploadProgress.value = { current: 0, total: entries.length, message: '检查仓库...' }

    // Step 0: Verify repo exists
    try {
      const repoCheck = await checkRepo(token, owner, repo)
      if (!repoCheck.exists) {
        throw new Error(repoCheck.message)
      }
      uploadProgress.value.message = repoCheck.message
      await new Promise(r => setTimeout(r, 500)) // brief pause so user sees the message
    } catch (e) {
      throw e
    }

    const allErrors = []

    try {
      // 1. Upload each diary as a markdown file
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const dateStr = entry.date.replace(/-/g, '')
        const safeTitle = (entry.title || '无标题').replace(/[\\/<>:"|?*]/g, '')
        const filename = `${dateStr}-${safeTitle}.md`

        // Build markdown content
        let mdContent = `# ${entry.title || '无标题'}\n\n`
        mdContent += `> ${entry.date}`
        if (entry.mood) mdContent += ` | 心情: ${entry.mood}`
        if (entry.tags && entry.tags.length) mdContent += ` | 标签: ${entry.tags.join(', ')}`
        if (entry.isAI) mdContent += ` | AI 生成`
        mdContent += `\n\n---\n\n`
        mdContent += entry.content + '\n'

        try {
          const existing = await getExistingFile(token, owner, repo, `diary/${filename}`)
          await createOrUpdateFile(
            token, owner, repo,
            `diary/${filename}`,
            mdContent,
            existing?.sha,
            branch
          )
        } catch (e) {
          allErrors.push({ file: filename, error: e.message })
        }

        uploadProgress.value = {
          current: i + 1,
          total: entries.length,
          message: `正在上传: ${filename}`
        }
      }

      // 2. Upload full JSON backup
      const jsonContent = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        count: entries.length,
        entries
      }, null, 2)

      try {
        const existing = await getExistingFile(token, owner, repo, 'backup/diary-full-backup.json')
        await createOrUpdateFile(
          token, owner, repo,
          'backup/diary-full-backup.json',
          jsonContent,
          existing?.sha,
          branch
        )
      } catch (e) {
        allErrors.push({ file: 'diary-full-backup.json', error: e.message })
      }

      lastSync.value = new Date().toISOString()
      localStorage.setItem('diary-github-last-sync', lastSync.value)

      uploadProgress.value = {
        current: entries.length,
        total: entries.length,
        message: allErrors.length === 0 ? '全部备份完成！' : `备份完成，${allErrors.length} 个文件失败`
      }

      errors.value = allErrors
      return { success: allErrors.length === 0, errors: allErrors }
    } finally {
      uploading.value = false
    }
  }

  return {
    config,
    uploading,
    uploadProgress,
    errors,
    lastSync,
    saveGitHubConfig,
    clearGitHubConfig,
    checkRepo,
    backupAll
  }
}
