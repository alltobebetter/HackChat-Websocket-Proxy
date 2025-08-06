# HackChat WebSocket Proxy for Vercel

一个稳定的 hack.chat WebSocket 代理服务，部署在 Vercel 上。

## 🚀 功能特点

- **稳定连接**: 自动重连机制，确保连接稳定性
- **心跳监控**: 定期检查连接状态，及时发现并处理断线
- **错误处理**: 完善的错误处理和恢复机制
- **连接池管理**: 高效管理多个并发连接
- **零配置**: 开箱即用，无需额外配置

## 📦 部署到 Vercel

### 1. 克隆或下载此项目

```bash
git clone <your-repo-url>
cd vercel
```

### 2. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 3. 登录 Vercel

```bash
vercel login
```

### 4. 部署项目

```bash
vercel --prod
```

### 5. 绑定自定义域名 (可选)

在 Vercel 控制台中绑定你的自定义域名，例如 `abc.com`

## 🔗 使用方法

部署完成后，你可以通过以下地址连接到 hack.chat：

```javascript
// 如果使用 Vercel 默认域名
const ws = new WebSocket('wss://your-project.vercel.app/chat-ws');

// 如果绑定了自定义域名
const ws = new WebSocket('wss://abc.com/chat-ws');
```

## 📋 API 端点

- `GET /` - 显示服务状态和使用说明
- `WebSocket /chat-ws` - WebSocket 代理端点

## 🛠️ 技术实现

### 核心功能

1. **WebSocket 代理**: 将客户端连接转发到 `wss://hack.chat/chat-ws`
2. **自动重连**: 连接断开时自动重连，最多重试 5 次
3. **心跳检测**: 每 30 秒检查一次连接状态
4. **连接管理**: 维护连接池，自动清理无效连接

### 文件结构

```
vercel/
├── package.json          # 项目依赖
├── vercel.json          # Vercel 配置
├── api/
│   ├── chat-ws.js       # WebSocket 代理主逻辑
│   └── index.html       # 状态页面
└── README.md            # 说明文档
```

## 🔧 配置选项

在 `api/chat-ws.js` 中可以调整以下参数：

```javascript
const HACKCHAT_WS_URL = 'wss://hack.chat/chat-ws';  // 目标 WebSocket 地址
const HEARTBEAT_INTERVAL = 30000;                   // 心跳间隔 (毫秒)
const RECONNECT_DELAY = 5000;                       // 重连延迟 (毫秒)
const MAX_RECONNECT_ATTEMPTS = 5;                   // 最大重连次数
```

## 📊 监控和日志

服务会在控制台输出详细的连接日志：

- 连接建立和断开
- 重连尝试
- 错误信息
- 活跃连接数

## 🐛 故障排除

### 常见问题

1. **连接失败**
   - 检查 Vercel 函数是否正常运行
   - 确认域名配置正确

2. **频繁断线**
   - 检查网络环境
   - 查看 Vercel 函数日志

3. **无法接收消息**
   - 确认 WebSocket 连接状态
   - 检查消息格式是否正确

### 调试方法

1. 访问部署的域名查看状态页面
2. 使用浏览器开发者工具检查 WebSocket 连接
3. 查看 Vercel 函数日志

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请创建 Issue 或联系维护者。
