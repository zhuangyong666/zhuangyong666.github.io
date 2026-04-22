<template>
  <div class="home">
    <div class="hero">
      <h1 class="hero-title">📔 我的日记</h1>
      <p class="hero-subtitle">记录生活，AI帮你留住每一天的温度</p>
    </div>

    <div class="actions">
      <router-link to="/diary/new" class="action-card primary">
        <span class="action-icon">✏️</span>
        <h3>写日记</h3>
        <p>用文字记录今天的故事</p>
      </router-link>
      <router-link to="/ai-diary" class="action-card ai">
        <span class="action-icon">✨</span>
        <h3>AI 自动写日记</h3>
        <p>告诉AI今天发生了什么，让它帮你写</p>
      </router-link>
      <router-link to="/diary" class="action-card">
        <span class="action-icon">📖</span>
        <h3>翻看日记</h3>
        <p>回顾过去的点点滴滴</p>
      </router-link>
    </div>

    <div v-if="recentEntries.length" class="recent">
      <h2 class="section-title">最近的日记</h2>
      <div class="recent-list">
        <router-link
          v-for="entry in recentEntries"
          :key="entry.id"
          :to="`/diary/${entry.id}`"
          class="recent-item"
        >
          <div class="recent-date">
            <span class="date-day">{{ formatDate(entry.date).day }}</span>
            <span class="date-month">{{ formatDate(entry.date).month }}</span>
          </div>
          <div class="recent-content">
            <h4>{{ entry.title || '无标题' }}</h4>
            <p>{{ stripContent(entry.content) }}</p>
          </div>
          <span v-if="entry.isAI" class="ai-badge">AI</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDiary } from '../stores/diary'

const { allEntries } = useDiary()
const recentEntries = computed(() => allEntries.value.slice(0, 5))

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('zh-CN', { month: 'short' })
  }
}

function stripContent(content) {
  if (!content) return ''
  return content.replace(/!\[.*?\]\(.*?\)/g, '[图片]').replace(/!?\[video\].*?\[\/video\]/g, '[视频]').slice(0, 80)
}
</script>

<style scoped>
.home {
  padding: 40px 0;
}

.hero {
  text-align: center;
  margin-bottom: 48px;
}

.hero-title {
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 12px;
  background: var(--ai-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
}

.actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 48px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  text-decoration: none;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px 24px;
  transition: all 0.3s;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.action-card.primary:hover {
  border-color: var(--primary);
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.15);
}

.action-card.ai:hover {
  border-color: #a855f7;
  box-shadow: 0 12px 24px rgba(168, 85, 247, 0.15);
}

.action-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.action-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.action-card p {
  color: var(--text-secondary);
  font-size: 14px;
}

.recent {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
}

.section-title {
  font-size: 20px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 16px;
  text-decoration: none;
  color: var(--text);
  padding: 12px;
  border-radius: 12px;
  transition: background 0.2s;
}

.recent-item:hover {
  background: var(--bg);
}

.recent-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
  padding: 8px;
  background: var(--bg);
  border-radius: 8px;
}

.date-day {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--primary);
}

.date-month {
  font-size: 12px;
  color: var(--text-secondary);
}

.recent-content {
  flex: 1;
  min-width: 0;
}

.recent-content h4 {
  font-size: 15px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-content p {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-badge {
  background: var(--ai-gradient);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
}

@media (max-width: 640px) {
  .actions {
    grid-template-columns: 1fr;
  }
  .hero-title {
    font-size: 32px;
  }
}
</style>
