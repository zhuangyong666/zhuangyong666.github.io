<template>
  <div class="diary-view">
    <div v-if="!entry" class="not-found">
      <p>日记不存在</p>
      <router-link to="/diary" class="btn primary">返回日记列表</router-link>
    </div>

    <template v-else>
      <div class="view-header">
        <button class="back-btn" @click="$router.back()">← 返回</button>
        <div class="header-actions">
          <span v-if="entry.isAI" class="ai-badge">AI 生成</span>
          <button class="btn secondary" @click="exportEntry" title="导出">📤 导出</button>
          <router-link :to="`/diary/${entry.id}/edit`" class="btn secondary">✏️ 编辑</router-link>
        </div>
      </div>

      <article class="diary-content">
        <div class="diary-meta">
          <h1 class="diary-title">{{ entry.title || '无标题' }}</h1>
          <div class="meta-info">
            <span class="date">{{ formatDate(entry.date) }}</span>
            <span v-if="entry.mood" class="mood">{{ getMoodEmoji(entry.mood) }} {{ entry.mood }}</span>
            <span v-for="tag in entry.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>

        <div class="diary-body" v-html="renderedContent"></div>
      </article>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { useDiary } from '../stores/diary'

const route = useRoute()
const { getById, resolveMedia } = useDiary()

const entry = computed(() => getById(route.params.id))

const md = new MarkdownIt({
  breaks: true,
  linkify: true
})

const renderedContent = computed(() => {
  if (!entry.value) return ''
  const content = resolveMedia(entry.value.content)
  let html = md.render(content)
  
  // Handle video tags [video]url[/video]
  html = html.replace(/\[video\](data:[^\[]+)\[\/video\]/g, (_, src) => {
    return `<video src="${src}" controls style="max-width: 100%; border-radius: 8px; margin: 12px 0;"></video>`
  })
  html = html.replace(/\[video\](media:\/\/[a-z0-9]+)\[\/video\]/g, (_, src) => {
    return `<video src="${src}" controls style="max-width: 100%; border-radius: 8px; margin: 12px 0;"></video>`
  })
  
  return html
})

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

function getMoodEmoji(mood) {
  const map = {
    happy: '😊', calm: '😌', excited: '🤩',
    sad: '😢', anxious: '😰', tired: '😴'
  }
  return map[mood] || ''
}

function exportEntry() {
  if (!entry.value) return
  let md = `# ${entry.value.title || '无标题'}\n\n`
  md += `> ${entry.value.date}`
  if (entry.value.mood) md += ` | 心情: ${entry.value.mood}`
  if (entry.value.tags && entry.value.tags.length) md += ` | 标签: ${entry.value.tags.join(', ')}`
  if (entry.value.isAI) md += ` | AI 生成`
  md += `\n\n---\n\n`
  md += entry.value.content + '\n'

  const dateStr = entry.value.date.replace(/-/g, '')
  const safeTitle = (entry.value.title || '无标题').replace(/[\\/<>:"|?*]/g, '')
  const filename = `${dateStr}-${safeTitle}.md`
  
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.diary-view {
  padding: 24px 0;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-badge {
  background: var(--ai-gradient);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
}

.btn.secondary {
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  font-size: 14px;
}

.diary-content {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 32px;
  border: 1px solid var(--border);
}

.diary-meta {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.diary-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.date {
  color: var(--text-secondary);
  font-size: 14px;
}

.mood {
  background: #fef3c7;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: #92400e;
}

.tag {
  background: var(--bg);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.diary-body {
  font-size: 16px;
  line-height: 2;
}

.diary-body :deep(p) {
  margin-bottom: 16px;
}

.diary-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}

.diary-body :deep(video) {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}

.diary-body :deep(strong) {
  font-weight: 600;
}

.diary-body :deep(em) {
  font-style: italic;
}

.not-found {
  text-align: center;
  padding: 60px 20px;
}

.btn.primary {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 16px;
}
</style>
