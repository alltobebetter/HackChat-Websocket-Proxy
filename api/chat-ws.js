const WebSocket = require('ws');
const { parse } = require('url');

// hack.chat WebSocket 目标地址
const HACKCHAT_WS_URL = 'wss://hack.chat/chat-ws';

// 连接池管理
const connections = new Map();

// 心跳间隔 (30秒)
const HEARTBEAT_INTERVAL = 30000;

// 重连延迟 (5秒)
const RECONNECT_DELAY = 5000;

// 最大重连次数
const MAX_RECONNECT_ATTEMPTS = 5;

class ProxyConnection {
  constructor(clientWs, connectionId) {
    this.clientWs = clientWs;
    this.connectionId = connectionId;
    this.hackChatWs = null;
    this.isAlive = true;
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    
    this.setupClientHandlers();
    this.connectToHackChat();
  }

  setupClientHandlers() {
    // 客户端消息处理
    this.clientWs.on('message', (data) => {
      if (this.hackChatWs && this.hackChatWs.readyState === WebSocket.OPEN) {
        try {
          this.hackChatWs.send(data);
        } catch (error) {
          console.error(`[${this.connectionId}] Error sending to hack.chat:`, error);
          this.reconnectToHackChat();
        }
      }
    });

    // 客户端断开连接
    this.clientWs.on('close', () => {
      console.log(`[${this.connectionId}] Client disconnected`);
      this.cleanup();
    });

    // 客户端错误
    this.clientWs.on('error', (error) => {
      console.error(`[${this.connectionId}] Client error:`, error);
      this.cleanup();
    });

    // 心跳检测
    this.clientWs.on('pong', () => {
      this.isAlive = true;
    });
  }

  connectToHackChat() {
    try {
      console.log(`[${this.connectionId}] Connecting to hack.chat...`);
      
      this.hackChatWs = new WebSocket(HACKCHAT_WS_URL, {
        headers: {
          'User-Agent': 'HackChat-Proxy/1.0',
          'Origin': 'https://hack.chat'
        },
        handshakeTimeout: 10000,
        perMessageDeflate: false
      });

      this.hackChatWs.on('open', () => {
        console.log(`[${this.connectionId}] Connected to hack.chat`);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      });

      this.hackChatWs.on('message', (data) => {
        if (this.clientWs.readyState === WebSocket.OPEN) {
          try {
            this.clientWs.send(data);
          } catch (error) {
            console.error(`[${this.connectionId}] Error sending to client:`, error);
            this.cleanup();
          }
        }
      });

      this.hackChatWs.on('close', (code, reason) => {
        console.log(`[${this.connectionId}] hack.chat connection closed:`, code, reason.toString());
        this.stopHeartbeat();
        
        if (this.clientWs.readyState === WebSocket.OPEN) {
          this.reconnectToHackChat();
        }
      });

      this.hackChatWs.on('error', (error) => {
        console.error(`[${this.connectionId}] hack.chat connection error:`, error);
        this.reconnectToHackChat();
      });

    } catch (error) {
      console.error(`[${this.connectionId}] Failed to create hack.chat connection:`, error);
      this.reconnectToHackChat();
    }
  }

  reconnectToHackChat() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[${this.connectionId}] Max reconnection attempts reached`);
      this.cleanup();
      return;
    }

    this.reconnectAttempts++;
    console.log(`[${this.connectionId}] Reconnecting to hack.chat (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(() => {
      if (this.clientWs.readyState === WebSocket.OPEN) {
        this.connectToHackChat();
      }
    }, RECONNECT_DELAY);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.isAlive) {
        console.log(`[${this.connectionId}] Client heartbeat failed, terminating connection`);
        this.cleanup();
        return;
      }

      this.isAlive = false;
      if (this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.ping();
      }

      // 检查hack.chat连接状态
      if (this.hackChatWs && this.hackChatWs.readyState !== WebSocket.OPEN) {
        this.reconnectToHackChat();
      }
    }, HEARTBEAT_INTERVAL);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  cleanup() {
    console.log(`[${this.connectionId}] Cleaning up connection`);
    
    this.stopHeartbeat();
    
    if (this.hackChatWs) {
      this.hackChatWs.removeAllListeners();
      if (this.hackChatWs.readyState === WebSocket.OPEN) {
        this.hackChatWs.close();
      }
      this.hackChatWs = null;
    }

    if (this.clientWs) {
      this.clientWs.removeAllListeners();
      if (this.clientWs.readyState === WebSocket.OPEN) {
        this.clientWs.close();
      }
    }

    connections.delete(this.connectionId);
  }
}

// Vercel Serverless Function Handler
module.exports = (req, res) => {
  // 检查是否为WebSocket升级请求
  if (req.headers.upgrade !== 'websocket') {
    res.status(400).json({ 
      error: 'WebSocket upgrade required',
      usage: 'Connect to wss://your-domain.com/chat-ws'
    });
    return;
  }

  // 生成连接ID
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${connectionId}] New WebSocket connection request`);

  // 创建WebSocket服务器
  const wss = new WebSocket.Server({
    noServer: true,
    perMessageDeflate: false,
    clientTracking: true
  });

  // 处理WebSocket升级
  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    console.log(`[${connectionId}] WebSocket connection established`);
    
    // 创建代理连接
    const proxyConnection = new ProxyConnection(ws, connectionId);
    connections.set(connectionId, proxyConnection);

    // 连接统计
    console.log(`Active connections: ${connections.size}`);
  });

  // 错误处理
  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
  });
};
