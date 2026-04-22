<template>
  <div class="diary-list">
    <div class="list-header">
      <h1>📖 我的日记</h1>
      <span class="count">{{ allEntries.length }} 篇</span>
      <span v-if="githubConfig" class="cloud-badge">☁️ {{ githubConfig.owner }}/{{ githubConfig.repo }}</span>
      <div class="header-actions">
        <button class="btn icon-btn" @click="showExport = true" title="导出">📤</button>
        <button class="btn icon-btn" @click="showGitHubConfig = true" :title="githubConfig ? 'GitHub 已连接' : '连接 GitHub'">
          {{ githubConfig ? '☁️' : '🔗' }}
        </button>
      </div>
    </div>

    <div v-if="!allEntries.length" class="empty">
      <span class="empty-icon">📝</span>
      <p>还没有日记，开始记录吧！</p>
      <router-link to="/diary/new" class="btn primary">写第一篇日记</router-link>
    </div>

    <div v-else class="entries">
      <div v-for="entry in allEntries" :key="entry.id" class="entry-card">
        <router-link :to="`/diary/${entry.id}`" class="entry-link">
          <div class="entry-date">
            <span class="date-day">{{ getDatePart(entry.date).day }}</span>
            <span class="date-weekday">{{ getDatePart(entry.date).weekday }}</span>
          </div>
          <div class="entry-body">
            <div class="entry-header">
              <h3>{{ entry.title || '无标题' }}</h3>
              <div class="entry-tags">
                <span v-if="entry.mood" class="tag mood">{{ entry.mood }}</span>
                <span v-if="entry.isAI" class="tag ai">AI</span>
                <span v-for="tag in (entry.tags || []).slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <p class="entry-preview">{{ stripContent(entry.content) }}</p>
          </div>
        </router-link>
        <div class="entry-actions">
          <button class="action-btn" @click.stop="exportSingle(entry)" title="导出">📤</button>
          <button class="delete-btn" @click.stop="handleDelete(entry.id)" title="删除">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div v-if="showExport" class="modal-overlay" @click.self="showExport = false">
      <div class="modal">
        <h2>📤 导出日记</h2>
        <p class="modal-desc">选择导出格式，所有 {{ allEntries.length }} 篇日记将被导出</p>
        <div class="export-options">
          <button class="export-btn" @click="exportAllJSON">
            <span class="export-icon">📋</span>
            <span class="export-label">JSON 格式</span>
            <span class="export-hint">完整数据，可用于恢复</span>
          </button>
          <button class="export-btn" @click="exportAllMarkdown">
            <span class="export-icon">📝</span>
            <span class="export-label">Markdown 格式</span>
            <span class="export-hint">每篇日记一个文件，打包下载</span>
          </button>
          <button class="export-btn" @click="exportAllSingle">
            <span class="export-icon">📄</span>
            <span class="export-label">逐篇导出</span>
            <span class="export-hint">分别下载每篇日记的 .md 文件</span>
          </button>
        </div>
        <button class="modal-close" @click="showExport = false">关闭</button>
      </div>
    </div>

    <!-- GitHub Config Modal -->
    <div v-if="showGitHubConfig" class="modal-overlay" @click.self="showGitHubConfig = false">
      <div class="modal wide">
        <h2>☁️ GitHub 同步</h2>
        <p class="modal-desc">将 GitHub 作为日记的主存储，支持图片、视频同步</p>

        <div v-if="!githubConfig" class="config-form">
          <div class="form-row">
            <label>Personal Access Token</label>
            <input v-model="ghForm.token" type="password" class="input" placeholder="ghp_xxxxxxxxxxxx" />
            <p class="hint">需要 repo 权限，在 <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a> 创建</p>
          </div>
          <div class="form-row-inline">
            <div class="form-row half">
              <label>仓库所有者</label>
              <input v-model="ghForm.owner" class="input" placeholder="your-username" />
            </div>
            <div class="form-row half">
              <label>仓库名</label>
              <input v-model="ghForm.repo" class="input" placeholder="my-diary" />
            </div>
          </div>
          <div class="form-row">
            <label>分支</label>
            <input v-model="ghForm.branch" class="input" placeholder="main" />
          </div>

          <!-- Verify button -->
          <button class="btn secondary full-width" @click="verifyConnection" :disabled="verifying">
            {{ verifying ? '验证中...' : '🔍 验证连接' }}
          </button>

          <!-- Verify result -->
          <div v-if="verifyResult" :class="['verify-result', verifyResult.ok ? 'ok' : 'fail']">
            {{ verifyResult.message }}
          </div>

          <button class="btn primary full-width" @click="connectGitHub" :disabled="!verifyResult?.ok">
            ☁️ 连接 GitHub 并加载
          </button>
          <p v-if="!verifyResult?.ok" class="hint">请先验证连接</p>
        </div>

        <!-- Already connected -->
        <div v-else>
          <div class="config-saved">
            <p>✅ 已连接: <strong>{{ githubConfig.owner }}/{{ githubConfig.repo }}</strong></p>
          </div>

          <button class="btn primary full-width" @click="loadFromGitHubAction" :disabled="syncing">
            {{ syncing ? '加载中...' : '🔄 从 GitHub 加载' }}
          </button>
          <button class="btn secondary full-width" @click="syncAllToGitHub" :disabled="syncing">
            {{ syncing ? '同步中...' : '📤 全部同步到 GitHub' }}
          </button>
          <button class="btn danger full-width" @click="handleDisconnect">断开连接</button>
        </div>

        <!-- Progress -->
        <div v-if="syncing" class="backup-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: syncProgressPercent + '%' }"></div>
          </div>
          <p>{{ syncProgress.message }}</p>
        </div>

        <!-- Error -->
        <div v-if="syncError" class="error-list">
          {{ syncError }}
        </div>

        <button class="modal-close" @click="showGitHubConfig = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useDiary } from '../stores/diary'

const { allEntries, getById, remove, githubConfig, setConfig, clearConfig, loadFromGitHub, syncing, syncError, syncProgress, syncEntry, deleteFromGh } = useDiary()

const showExport = ref(false)
const showGitHubConfig = ref(false)
const verifying = ref(false)
const verifyResult = ref(null)

const ghForm = reactive({
  token: '',
  owner: '',
  repo: '',
  branch: 'main'
})

// Load from GitHub on mount if configured
onMounted(async () => {
  if (githubConfig.value) {
    await loadFromGitHub()
  }
})

async function verifyConnection() {
  if (!ghForm.token || !ghForm.owner || !ghForm.repo) {
    verifyResult.value = { ok: false, message: '请填写 Token、仓库所有者和仓库名' }
    return
  }
  verifying.value = true
  verifyResult.value = null
  try {
    const res = await fetch(`https://api.github.com/repos/${ghForm.owner}/${ghForm.repo}`, {
      headers: {
        'Authorization': `token ${ghForm.token}`,
        'Accept': 'application/vnd.github+json'
      }
    })
    if (res.status === 404) {
      verifyResult.value = { ok: false, message: `仓库 ${ghForm.owner}/${ghForm.repo} 不存在` }
    } else if (res.status === 401) {
      verifyResult.value = { ok: false, message: 'Token 无效或已过期' }
    } else if (res.ok) {
      const data = await res.json()
      verifyResult.value = { ok: true, message: `仓库: ${ghForm.owner}/${ghForm.repo} (${data.private ? '私有' : '公开'})` }
    } else {
      const err = await res.json().catch(() => ({}))
      verifyResult.value = { ok: false, message: err.message || `连接失败: ${res.status}` }
    }
  } catch (e) {
    verifyResult.value = { ok: false, message: '连接失败: ' + e.message }
  } finally {
    verifying.value = false
  }
}

async function connectGitHub() {
  if (!verifyResult.value?.ok) return
  setConfig({
    token: ghForm.token,
    owner: ghForm.owner,
    repo: ghForm.repo,
    branch: ghForm.branch || 'main'
  })
  await loadFromGitHubAction()
}

async function loadFromGitHubAction() {
  const ok = await loadFromGitHub()
  if (!ok && !syncError.value) {
    // No data on GitHub yet - that's ok for first time
  }
}

async function syncAllToGitHub() {
  for (const entry of allEntries.value) {
    await syncEntry(entry)
  }
  alert('全部同步完成！')
}

function handleDisconnect() {
  if (confirm('确定要断开 GitHub 连接吗？本地数据不会丢失。')) {
    clearConfig()
  }
}

const syncProgressPercent = computed(() => {
  if (!syncProgress.value.total) return 0
  return Math.round((syncProgress.value.current / syncProgress.value.total) * 100)
})

function getDatePart(dateStr) {
  const d = new Date(dateStr)
  return {
    day: d.getDate(),
    weekday: d.toLocaleDateString('zh-CN', { weekday: 'short' })
  }
}

function stripContent(content) {
  if (!content) return ''
  return content
    .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
    .replace(/!?\[video\].*?\[\/video\]/g, '[视频]')
    .replace(/\n+/g, ' ')
    .slice(0, 100)
}

async function handleDelete(id) {
  if (confirm('确定要删除这篇日记吗？此操作不可恢复。')) {
    const entry = getById(id)
    await remove(id)
    if (entry && githubConfig.value) {
      deleteFromGh(entry).catch(() => {})
    }
  }
}

function downloadFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportAllJSON() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: allEntries.value.length,
    entries: allEntries.value
  }
  const filename = `diary-export-${new Date().toISOString().split('T')[0]}.json`
  downloadFile(filename, JSON.stringify(data, null, 2))
  showExport.value = false
}

function exportAllMarkdown() {
  // Create a single combined markdown file
  let md = `# 我的日记\n\n> 导出时间: ${new Date().toLocaleString('zh-CN')}\n> 共 ${allEntries.value.length} 篇\n\n---\n\n`
  
  allEntries.value.forEach(entry => {
    md += `# ${entry.title || '无标题'}\n\n`
    md += `> ${entry.date}`
    if (entry.mood) md += ` | 心情: ${entry.mood}`
    if (entry.tags && entry.tags.length) md += ` | 标签: ${entry.tags.join(', ')}`
    if (entry.isAI) md += ` | AI 生成`
    md += `\n\n---\n\n`
    md += entry.content + '\n\n---\n\n'
  })

  const filename = `diary-${new Date().toISOString().split('T')[0]}.md`
  downloadFile(filename, md, 'text/markdown')
  showExport.value = false
}

function exportAllSingle() {
  allEntries.value.forEach(entry => {
    let md = `# ${entry.title || '无标题'}\n\n`
    md += `> ${entry.date}`
    if (entry.mood) md += ` | 心情: ${entry.mood}`
    if (entry.tags && entry.tags.length) md += ` | 标签: ${entry.tags.join(', ')}`
    if (entry.isAI) md += ` | AI 生成`
    md += `\n\n---\n\n`
    md += entry.content + '\n'

    const dateStr = entry.date.replace(/-/g, '')
    const safeTitle = (entry.title || '无标题').replace(/[\\/<>:"|?*]/g, '')
    const filename = `${dateStr}-${safeTitle}.md`
    downloadFile(filename, md, 'text/markdown')
  })
  showExport.value = false
}

function exportSingle(entry) {
  let md = `# ${entry.title || '无标题'}\n\n`
  md += `> ${entry.date}`
  if (entry.mood) md += ` | 心情: ${entry.mood}`
  if (entry.tags && entry.tags.length) md += ` | 标签: ${entry.tags.join(', ')}`
  if (entry.isAI) md += ` | AI 生成`
  md += `\n\n---\n\n`
  md += entry.content + '\n'

  const dateStr = entry.date.replace(/-/g, '')
  const safeTitle = (entry.title || '无标题').replace(/[\\/<>:"|?*]/g, '')
  const filename = `${dateStr}-${safeTitle}.md`
  downloadFile(filename, md, 'text/markdown')
}

const progressPercent = computed(() => {
  if (!uploadProgress.value.total) return 0
  return Math.round((uploadProgress.value.current / uploadProgress.value.total) * 100)
})

</script>

<style scoped>
.diary-list {
  padding: 24px 0;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.list-header h1 {
  font-size: 24px;
}

.count {
  background: var(--bg);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.cloud-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty p {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.entry-card:hover {
  border-color: var(--primary-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.entry-link {
  display: flex;
  gap: 16px;
  flex: 1;
  text-decoration: none;
  color: var(--text);
  padding: 16px;
}

.entry-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
  padding: 10px;
  background: var(--bg);
  border-radius: 10px;
}

.date-day {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
}

.date-weekday {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.entry-header h3 {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-tags {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-secondary);
}

.tag.mood {
  background: #fef3c7;
  color: #92400e;
}

.tag.ai {
  background: var(--ai-gradient);
  color: white;
}

.entry-preview {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.entry-card:hover .entry-actions {
  opacity: 1;
}

.action-btn, .delete-btn {
  background: none;
  border: none;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 16px;
}

.btn.icon-btn {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 16px;
}

.btn.icon-btn:hover {
  background: #e2e8f0;
}

.btn.primary {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal.wide {
  max-width: 560px;
}

.modal h2 {
  font-size: 20px;
  margin-bottom: 8px;
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  border-color: var(--primary);
  background: #f0f0ff;
}

.export-icon {
  font-size: 28px;
}

.export-label {
  font-size: 15px;
  font-weight: 600;
}

.export-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.modal-close {
  width: 100%;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.modal-close:hover {
  background: #e2e8f0;
}

/* GitHub Config */
.config-form {
  margin-bottom: 16px;
}

.form-row {
  margin-bottom: 14px;
}

.form-row label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.hint a {
  color: var(--primary);
}

.config-saved {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
}

.config-saved p {
  font-size: 14px;
  color: #065f46;
}

.btn.full-width {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.btn.primary.full-width {
  background: var(--primary);
  color: white;
}

.btn.primary.full-width:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.danger.full-width {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.backup-progress {
  margin: 16px 0;
  text-align: center;
}

.progress-bar {
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--ai-gradient);
  border-radius: 4px;
  transition: width 0.3s;
}

.backup-progress p {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row-inline {
  display: flex;
  gap: 12px;
}

.form-row-inline .half {
  flex: 1;
  margin-bottom: 14px;
}

.verify-result {
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
}

.verify-result.ok {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.verify-result.fail {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.error-list {
  margin-top: 16px;
  padding: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.error-list h4 {
  font-size: 14px;
  color: #991b1b;
  margin-bottom: 8px;
}

.error-item {
  font-size: 13px;
  color: #991b1b;
  padding: 4px 0;
}

.error-item code {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
