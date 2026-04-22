<template>
  <div class="app">
    <nav class="navbar">
      <router-link to="/" class="nav-logo">
        <span class="logo-icon">📔</span>
        <span class="logo-text">日记</span>
      </router-link>
      <div class="nav-links">
        <router-link to="/diary" class="nav-link">日记本</router-link>
        <router-link to="/ai-diary" class="nav-link ai-link">✨ AI写日记</router-link>
        <router-link to="/diary/new" class="nav-btn">+ 写日记</router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #6366f1;
  --primary-light: #818cf8;
  --primary-dark: #4f46e5;
  --bg: #f8f9fc;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --ai-gradient: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
}

.navbar {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover, .nav-link.router-link-active {
  color: var(--primary);
  background: #f0f0ff;
}

.ai-link {
  background: var(--ai-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
}

.nav-link.ai-link:hover {
  background: rgba(99, 102, 241, 0.1);
  -webkit-text-fill-color: var(--primary);
}

.nav-btn {
  text-decoration: none;
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.main-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

@media (max-width: 640px) {
  .navbar {
    padding: 0 16px;
  }
  .nav-links {
    gap: 8px;
  }
  .nav-link {
    padding: 6px 8px;
    font-size: 14px;
  }
  .nav-btn {
    padding: 6px 12px;
    font-size: 14px;
  }
  .main-content {
    padding: 16px;
  }
}
</style>
