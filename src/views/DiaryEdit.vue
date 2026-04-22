<template>
  <div class="diary-edit">
    <div class="edit-header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h1>{{ isEdit ? '编辑日记' : '写日记' }}</h1>
    </div>

    <form @submit.prevent="handleSave" class="edit-form">
      <div class="form-row">
        <label>日期</label>
        <input type="date" v-model="form.date" class="input" />
      </div>

      <div class="form-row">
        <label>标题</label>
        <input type="text" v-model="form.title" class="input" placeholder="给今天取个标题..." />
      </div>

      <div class="form-row">
        <label>心情</label>
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
        <label>内容</label>
        <div class="editor-wrapper">
          <div class="editor-toolbar">
            <button type="button" @click="insertImage" title="插入图片" class="toolbar-btn">🖼️ 图片</button>
            <button type="button" @click="insertVideo" title="插入视频" class="toolbar-btn">🎬 视频</button>
            <button type="button" @click="insertBold" title="粗体" class="toolbar-btn"><b>B</b></button>
            <button type="button" @click="insertItalic" title="斜体" class="toolbar-btn"><i>I</i></button>
          </div>
          <textarea
            ref="contentRef"
            v-model="form.content"
            class="editor"
            placeholder="今天发生了什么...&#10;&#10;支持 Markdown 格式：&#10;**粗体** *斜体*&#10;![图片](url) 插入图片&#10;[video]视频URL[/video] 插入视频"
          ></textarea>
          <input
            ref="imageInput"
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="handleImageUpload"
          />
          <input
            ref="videoInput"
            type="file"
            accept="video/*"
            hidden
            @change="handleVideoUpload"
          />
        </div>
      </div>

      <div class="form-row">
        <label>标签</label>
        <div class="tags-input">
          <span v-for="(tag, i) in form.tags" :key="i" class="tag-chip">
            {{ tag }}
            <button type="button" @click="form.tags.splice(i, 1)">×</button>
          </span>
          <input
            v-model="tagInput"
            @keydown.enter.prevent="addTag"
            class="tag-input"
            placeholder="输入标签后回车"
          />
        </div>
      </div>

      <!-- Image Preview -->
      <div v-if="imagePreviews.length" class="preview-section">
        <h3>已添加的图片</h3>
        <div class="preview-grid">
          <div v-for="(src, i) in imagePreviews" :key="i" class="preview-item">
            <img :src="src" alt="preview" />
            <button type="button" class="preview-remove" @click="removeImage(i)">×</button>
          </div>
        </div>
      </div>

      <!-- Video Preview -->
      <div v-if="videoPreviews.length" class="preview-section">
        <h3>已添加的视频</h3>
        <div class="preview-grid">
          <div v-for="(src, i) in videoPreviews" :key="i" class="preview-item video-item">
            <video :src="src" controls></video>
            <button type="button" class="preview-remove" @click="removeVideo(i)">×</button>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn secondary" @click="$router.back()">取消</button>
        <button type="submit" class="btn primary" :disabled="saving">
          {{ saving ? '保存中...' : (isEdit ? '保存修改' : '保存日记') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDiary } from '../stores/diary'

const route = useRoute()
const { getById, create, update, handleFile, resolveMedia } = useDiary()
const isEdit = computed(() => !!route.params.id)
const contentRef = ref(null)
const imageInput = ref(null)
const videoInput = ref(null)
const tagInput = ref('')
const saving = ref(false)

const moods = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'calm', label: '平静', emoji: '😌' },
  { value: 'excited', label: '兴奋', emoji: '🤩' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'anxious', label: '焦虑', emoji: '😰' },
  { value: 'tired', label: '疲惫', emoji: '😴' }
]

const form = reactive({
  date: new Date().toISOString().split('T')[0],
  title: '',
  content: '',
  mood: '',
  tags: []
})

const imagePreviews = ref([])
const videoPreviews = ref([])

// Track media files that need to be stored
const pendingMedia = ref([])

onMounted(async () => {
  if (isEdit.value) {
    const entry = getById(route.params.id)
    if (entry) {
      form.date = entry.date
      form.title = entry.title
      form.content = entry.content
      form.mood = entry.mood || ''
      form.tags = [...(entry.tags || [])]
      
      // Extract and show existing media
      const resolvedContent = resolveMedia(entry.content)
      const imgMatches = resolvedContent.match(/!\[.*?\]\((data:.*?)\)/g) || []
      const videoMatches = resolvedContent.match(/\[video\](data:.*?)\[\/video\]/g) || []
      
      imgMatches.forEach(m => {
        const src = m.match(/\((data:.*?)\)/)?.[1]
        if (src) imagePreviews.value.push(src)
      })
      videoMatches.forEach(m => {
        const src = m.match(/\[video\](data:.*?)\[\/video\]/)?.[1]
        if (src) videoPreviews.value.push(src)
      })
    }
  }
})

function insertImage() {
  imageInput.value.click()
}

function insertVideo() {
  videoInput.value.click()
}

async function handleImageUpload(e) {
  const files = Array.from(e.target.files)
  for (const file of files) {
    const mediaRef = await handleFile(file)
    const dataUrl = mediaRef.startsWith('media://') ? await readFileAsDataUrl(file) : mediaRef
    imagePreviews.value.push(dataUrl)
    
    const md = `![${file.name}](${mediaRef})\n`
    form.content += md
  }
  e.target.value = ''
}

async function handleVideoUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const mediaRef = await handleFile(file)
  const dataUrl = mediaRef.startsWith('media://') ? await readFileAsDataUrl(file) : mediaRef
  videoPreviews.value.push(dataUrl)
  
  form.content += `[video]${mediaRef}[/video]\n`
  e.target.value = ''
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

function removeImage(index) {
  imagePreviews.value.splice(index, 1)
  // Also remove corresponding markdown from content
  const lines = form.content.split('\n')
  let imgCount = 0
  const newLines = lines.filter(line => {
    if (line.startsWith('![')) {
      if (imgCount === index) {
        imgCount++
        return false
      }
      imgCount++
    }
    return true
  })
  form.content = newLines.join('\n')
}

function removeVideo(index) {
  videoPreviews.value.splice(index, 1)
  const lines = form.content.split('\n')
  let vidCount = 0
  const newLines = lines.filter(line => {
    if (line.startsWith('[video]')) {
      if (vidCount === index) {
        vidCount++
        return false
      }
      vidCount++
    }
    return true
  })
  form.content = newLines.join('\n')
}

function insertBold() {
  const ta = contentRef.value
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = form.content
  const selected = text.substring(start, end) || '粗体文字'
  form.content = text.substring(0, start) + `**${selected}**` + text.substring(end)
}

function insertItalic() {
  const ta = contentRef.value
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const text = form.content
  const selected = text.substring(start, end) || '斜体文字'
  form.content = text.substring(0, start) + `*${selected}*` + text.substring(end)
}

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

async function handleSave() {
  saving.value = true
  try {
    const data = {
      date: form.date,
      title: form.title,
      content: form.content,
      mood: form.mood,
      tags: [...form.tags]
    }

    if (isEdit.value) {
      await update(route.params.id, data)
    } else {
      create(data)
    }

    // Only save locally, no auto GitHub backup
    window.location.href = '/#/diary'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.diary-edit {
  padding: 24px 0;
}

.edit-header {
  display: flex;
  align-items: center;
  gap: 16px;
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

.edit-header h1 {
  font-size: 24px;
}

.edit-form {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--border);
}

.form-row {
  margin-bottom: 20px;
}

.form-row label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.mood-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mood-btn {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.mood-btn:hover {
  border-color: var(--primary-light);
}

.mood-btn.active {
  border-color: var(--primary);
  background: #f0f0ff;
}

.editor-wrapper {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.toolbar-btn {
  padding: 6px 10px;
  border: none;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.toolbar-btn:hover {
  background: #e2e8f0;
}

.editor {
  width: 100%;
  min-height: 240px;
  padding: 14px;
  border: none;
  font-size: 15px;
  line-height: 1.8;
  font-family: inherit;
  resize: vertical;
}

.editor:focus {
  outline: none;
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  min-height: 42px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--primary);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.tag-chip button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.tag-input {
  border: none;
  outline: none;
  font-size: 14px;
  flex: 1;
  min-width: 100px;
}

.preview-section {
  margin-bottom: 20px;
}

.preview-section h3 {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.preview-item img {
  max-width: 120px;
  max-height: 120px;
  object-fit: cover;
  display: block;
}

.preview-item video {
  max-width: 200px;
  max-height: 120px;
  display: block;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn.primary {
  background: var(--primary);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}
</style>
