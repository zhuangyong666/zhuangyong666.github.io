<template>
  <div class="ai-diary">
    <div class="ai-header">
      <h1>✨ AI 自动写日记</h1>
      <p class="subtitle">告诉 AI 今天发生了什么，它帮你写成一篇日记</p>
    </div>

    <div class="ai-container">
      <!-- Input Panel -->
      <div class="input-panel">
        <h2>📝 告诉 AI 今天的情况</h2>
        
        <div class="form-row">
          <label>今天的心情</label>
          <div class="mood-picker">
            <button
              v-for="m in moods"
              :key="m.value"
              type="button"
              :class="['mood-btn', { active: form.mood === m.value }]"
              @click="form.mood = m.value"
            >
              {{ m.emoji }} {{ m.label }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <label>今天天气</label>
          <div class="weather-picker">
            <button
              v-for="w in weathers"
              :key="w.value"
              type="button"
              :class="['weather-btn', { active: form.weather === w.value }]"
              @click="form.weather = w.value"
            >
              {{ w.emoji }} {{ w.label }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <label>今天发生了什么？</label>
          <textarea
            v-model="form.events"
            class="events-input"
            placeholder="用简短的话描述今天的事情，例如：&#10;• 早上去公园跑步了&#10;• 中午和朋友吃了火锅&#10;• 下午完成了一个重要的项目&#10;• 晚上看了一部电影"
          ></textarea>
        </div>

        <div class="form-row">
          <label>日记风格</label>
          <div class="style-picker">
            <button
              v-for="s in styles"
              :key="s.value"
              type="button"
              :class="['style-btn', { active: form.style === s.value }]"
              @click="form.style = s.value"
            >
              {{ s.emoji }} {{ s.label }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <label>OpenAI API Key（可选）</label>
          <input
            v-model="form.apiKey"
            type="password"
            class="input"
            placeholder="sk-... 留空使用内置模板"
          />
          <p class="hint">留空将使用内置模板生成，填入 API Key 后使用 GPT 实时生成</p>
        </div>

        <button
          class="btn generate-btn"
          @click="handleGenerate"
          :disabled="generating"
        >
          {{ generating ? '✨ AI 正在写...' : '✨ 让 AI 帮我写' }}
        </button>
      </div>

      <!-- Output Panel -->
      <div v-if="generatedContent" class="output-panel">
        <div class="output-header">
          <h2>📄 AI 生成的日记</h2>
          <div class="output-actions">
            <button class="btn secondary" @click="handleRegenerate">🔄 重新生成</button>
            <button class="btn primary" @click="handleSave">💾 保存为日记</button>
          </div>
        </div>

        <div class="output-content">
          <div class="output-meta">
            <input
              v-model="outputTitle"
              class="title-input"
              placeholder="给日记取个标题..."
            />
            <div class="meta-tags">
              <span class="ai-tag">AI 生成</span>
              <span class="date-tag">{{ todayStr }}</span>
            </div>
          </div>
          <div class="output-body" v-html="renderedOutput"></div>
        </div>

        <!-- Save Options -->
        <div v-if="showSaveOptions" class="save-options">
          <div class="form-row">
            <label>心情</label>
            <select v-model="saveForm.mood" class="input">
              <option value="">不指定</option>
              <option v-for="m in moods" :key="m.value" :value="m.value">{{ m.emoji }} {{ m.label }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>标签（逗号分隔）</label>
            <input v-model="saveForm.tagsInput" class="input" placeholder="生活, 日常" />
          </div>
        </div>
      </div>

      <!-- Loading Animation -->
      <div v-if="generating" class="loading-panel">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>AI 正在构思你的日记...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { useRouter } from 'vue-router'
import { generateDiary } from '../composables/aiService'
import { useDiary } from '../stores/diary'

const router = useRouter()
const { create } = useDiary()

const md = new MarkdownIt({ breaks: true, linkify: true })

const moods = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'calm', label: '平静', emoji: '😌' },
  { value: 'excited', label: '兴奋', emoji: '🤩' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'anxious', label: '焦虑', emoji: '😰' },
  { value: 'tired', label: '疲惫', emoji: '😴' }
]

const weathers = [
  { value: 'sunny', label: '晴天', emoji: '☀️' },
  { value: 'cloudy', label: '多云', emoji: '☁️' },
  { value: 'rainy', label: '雨天', emoji: '🌧️' },
  { value: 'snowy', label: '雪天', emoji: '❄️' }
]

const styles = [
  { value: 'default', label: '日常', emoji: '📝' },
  { value: 'travel', label: '旅行', emoji: '✈️' },
  { value: 'work', label: '工作', emoji: '💼' }
]

const form = reactive({
  mood: '',
  weather: '',
  events: '',
  style: 'default',
  apiKey: ''
})

const generating = ref(false)
const generatedContent = ref('')
const outputTitle = ref('')
const showSaveOptions = ref(false)
const saveForm = reactive({
  mood: '',
  tagsInput: ''
})

const todayStr = computed(() => {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
})

const renderedOutput = computed(() => {
  return md.render(generatedContent.value)
})

async function handleGenerate() {
  if (!form.events && !form.mood && !form.weather) {
    alert('至少描述一下今天的情况或心情吧～')
    return
  }

  generating.value = true
  generatedContent.value = ''
  showSaveOptions.value = false

  try {
    const result = await generateDiary({
      mood: form.mood,
      weather: form.weather,
      events: form.events,
      style: form.style,
      apiKey: form.apiKey
    })
    generatedContent.value = result
    
    // Auto-generate title
    const firstLine = result.split('\n').find(l => l.trim()) || ''
    outputTitle.value = firstLine.slice(0, 20) + (firstLine.length > 20 ? '...' : '')
    saveForm.mood = form.mood
  } finally {
    generating.value = false
  }
}

function handleRegenerate() {
  handleGenerate()
}

function handleSave() {
  showSaveOptions.value = !showSaveOptions.value
  
  if (!showSaveOptions.value) {
    // Actually save
    const tags = saveForm.tagsInput
      ? saveForm.tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      : []

    create({
      date: new Date().toISOString().split('T')[0],
      title: outputTitle.value || 'AI 日记',
      content: generatedContent.value,
      mood: saveForm.mood || form.mood,
      tags,
      isAI: true
    })

    alert('日记已保存！')
    router.push('/diary')
  }
}
</script>

<style scoped>
.ai-diary {
  padding: 24px 0;
}

.ai-header {
  text-align: center;
  margin-bottom: 32px;
}

.ai-header h1 {
  font-size: 28px;
  background: var(--ai-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 8px;
}

.ai-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.input-panel, .output-panel {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
}

.input-panel h2, .output-panel h2 {
  font-size: 18px;
  margin-bottom: 20px;
}

.form-row {
  margin-bottom: 16px;
}

.form-row label {
  display: block;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.mood-picker, .weather-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mood-btn, .weather-btn {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.mood-btn:hover, .weather-btn:hover {
  border-color: var(--primary-light);
}

.mood-btn.active, .weather-btn.active {
  border-color: var(--primary);
  background: #f0f0ff;
}

.style-picker {
  display: flex;
  gap: 8px;
}

.style-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.style-btn.active {
  border-color: var(--primary);
  background: #f0f0ff;
}

.events-input {
  width: 100%;
  min-height: 140px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
}

.events-input:focus {
  outline: none;
  border-color: var(--primary);
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
  margin-top: 6px;
}

.generate-btn {
  width: 100%;
  padding: 14px;
  background: var(--ai-gradient);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.output-header h2 {
  margin-bottom: 0;
}

.output-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn.primary {
  background: var(--primary);
  color: white;
}

.btn.primary:hover {
  background: var(--primary-dark);
}

.btn.secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.output-meta {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.title-input {
  width: 100%;
  font-size: 20px;
  font-weight: 700;
  border: none;
  outline: none;
  margin-bottom: 8px;
}

.meta-tags {
  display: flex;
  gap: 8px;
}

.ai-tag {
  background: var(--ai-gradient);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.date-tag {
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.output-body {
  font-size: 15px;
  line-height: 1.9;
  min-height: 200px;
}

.output-body :deep(p) {
  margin-bottom: 12px;
}

.save-options {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.loading-panel {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.loading-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  animation: bounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0.32s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-panel p {
  color: var(--text-secondary);
  font-size: 16px;
}

@media (max-width: 768px) {
  .ai-container {
    grid-template-columns: 1fr;
  }
}
</style>
