# 我的日记 📔

AI 智能日记应用，支持图文视频混排，自动备份到 GitHub。

## 功能

- ✏️ 写日记 - 支持 Markdown、图片、视频
- ✨ AI 自动写日记 - 描述今天的事，AI 帮你写
- 📤 导出 - JSON / Markdown 格式
- ☁️ GitHub 自动备份 - 写完自动同步，换设备不丢数据
- 📱 PWA 支持 - 手机浏览器可安装到桌面
- 🤖 Android App - 基于 Capacitor 打包

## 开发

```bash
npm install
npm run dev
```

## 手机使用

### 方式 1：PWA 安装（推荐，无需编译）

1. 部署到任何静态服务器（GitHub Pages / Vercel / Netlify）
2. 手机浏览器打开网站
3. 点击"添加到主屏幕"
4. 即可像原生 App 一样使用

### 方式 2：Android APK

需要先安装 Android Studio，然后：

```bash
npm run build
npx cap sync android
npx cap open android
```

在 Android Studio 中 Build → Build Bundle(s) / APK(s) → Build APK(s)

## GitHub 自动备份

1. 创建 [Personal Access Token](https://github.com/settings/tokens)（Classic，勾选 repo 权限）
2. 创建私有仓库
3. 在 App 中点击 🔗 按钮配置连接
4. 之后每次保存日记都会自动备份到 GitHub
