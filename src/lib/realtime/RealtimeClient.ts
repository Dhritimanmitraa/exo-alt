import type {
  RealtimeClientMessage,
  RealtimeServerMessage,
  UserPresence,
  UserId,
  RoomId,
  PlanetId,
  CameraState,
} from './types';

type MessageHandler<T extends RealtimeServerMessage> = (message: T) => void;

// Simplified handler map typing to avoid complex conditional types in sets
type HandlersMap = Partial<Record<RealtimeServerMessage['type'], Set<(message: any) => void>>>;

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15_000;

export interface RealtimeClientOptions {
  url?: string; // ws(s) url
  roomId?: string;
  storage?: Storage;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string | null = null;
  private user: UserPresence | null = null;
  private messageQueue: RealtimeClientMessage[] = [];
  private handlers: HandlersMap = {};
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private storage: Storage;
  private eventHandlers: {
    connected: Set<() => void>;
    disconnected: Set<() => void>;
    error: Set<(message?: string) => void>;
  } = {
    connected: new Set(),
    disconnected: new Set(),
    error: new Set(),
  };

  constructor(options: RealtimeClientOptions = {}) {
    const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_REALTIME_URL : undefined) as string | undefined;
    this.url = options.url ?? envUrl ?? (typeof location !== 'undefined' ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + (location.host || 'localhost:3001') + '/ws' : 'ws://localhost:3001/ws');
    this.roomId = options.roomId || null;
    this.storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : ({} as Storage));
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getCurrentUser(): UserPresence | null {
    return this.user;
  }

  public subscribe<K extends RealtimeServerMessage['type']>(type: K, handler: MessageHandler<Extract<RealtimeServerMessage, { type: K }>>): () => void {
    if (!this.handlers[type]) this.handlers[type] = new Set();
    this.handlers[type]!.add(handler as any);
    return () => {
      this.handlers[type]!.delete(handler as any);
    };
  }

  public async connect(roomId: string, userId?: string): Promise<void> {
    this.roomId = roomId;

    // Restore or create user identity
    const generateId = () => {
      try {
        // Prefer secure random UUID when available
        const anyCrypto: any = (typeof crypto !== 'undefined') ? crypto : (typeof window !== 'undefined' ? (window as any).crypto : undefined);
        if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
      } catch {}
      // Fallback
      return `u_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    };
    const existingId = userId || this.storage.getItem('exo-user-id') || generateId();
    try { this.storage.setItem('exo-user-id', existingId); } catch {}

    const name = this.storage.getItem('exo-user-name') || this.generateDisplayName();
    const color = this.storage.getItem('exo-user-color') || this.generateColor();
    try { this.storage.setItem('exo-user-name', name); } catch {}
    try { this.storage.setItem('exo-user-color', color); } catch {}

    const now = Date.now();
    this.user = {
      id: existingId as UserId,
      name,
      color,
      joinedAt: now,
      lastSeen: now,
    };

    await this.openSocket();
    this.startHeartbeat();
    // Send join
    this.send({ type: 'join', roomId, user: this.user });
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    this.ws = null;
    this.clearReconnect();
  }

  public async reconnect(): Promise<void> {
    if (!this.roomId) return;
    if (this.isConnected()) return;
    await this.openSocket();
    if (this.user) {
      this.send({ type: 'join', roomId: this.roomId, user: this.user });
    }
  }

  public send<T extends RealtimeClientMessage>(message: T): void {
    if (!this.isConnected() || !this.ws) {
      this.messageQueue.push(message);
      return;
    }
    try {
      this.ws.send(JSON.stringify(message));
    } catch {
      // Queue on failure for retry
      this.messageQueue.push(message);
    }
  }

  public updatePresence(partial: Partial<UserPresence>) {
    if (!this.user) return;
    this.user = { ...this.user, ...partial, lastSeen: Date.now() };
  }

  public sendCamera(planetId: PlanetId | string, camera: CameraState) {
    if (!this.user) return;
    this.send({ type: 'camera', planetId: String(planetId), camera, userId: String(this.user.id) });
  }

  private async openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.url);
        this.ws = ws;

        ws.onopen = () => {
          this.reconnectAttempts = 0;
          // flush queue
          const queue = [...this.messageQueue];
          this.messageQueue = [];
          for (const m of queue) {
            this.send(m);
          }
          // notify listeners
          for (const h of this.eventHandlers.connected) {
            try { h(); } catch {}
          }
          resolve();
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data) as RealtimeServerMessage;
            this.dispatch(msg);
          } catch (e) {
            // ignore malformed
          }
        };

        ws.onerror = () => {
          // allow close handler to schedule reconnect
          for (const h of this.eventHandlers.error) {
            try { h('socket error'); } catch {}
          }
        };

        ws.onclose = () => {
          for (const h of this.eventHandlers.disconnected) {
            try { h(); } catch {}
          }
          this.scheduleReconnect();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private dispatch(msg: RealtimeServerMessage) {
    const setForType = this.handlers[msg.type];
    if (!setForType || setForType.size === 0) return;
    for (const h of setForType) {
      try { (h as any)(msg); } catch {}
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.user) return;
      this.send({ type: 'heartbeat', userId: String(this.user.id), ts: Date.now() });
    }, HEARTBEAT_INTERVAL_MS) as unknown as number;
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) return; // already scheduled
    const attempt = this.reconnectAttempts++;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt), RECONNECT_MAX_DELAY_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.roomId) return;
      this.openSocket().then(() => {
        if (this.user && this.roomId) {
          this.send({ type: 'join', roomId: this.roomId, user: this.user });
          this.startHeartbeat();
        }
      }).catch(() => {
        // schedule next
        this.scheduleReconnect();
      });
    }, delay) as unknown as number;
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private generateDisplayName(): string {
    const animals = ['Orion', 'Lyra', 'Vega', 'Draco', 'Nova', 'Cosmo', 'Atlas', 'Luna'];
    const n = Math.floor(Math.random() * animals.length);
    const num = Math.floor(100 + Math.random() * 900);
    return `${animals[n]} ${num}`;
  }

  private generateColor(): string {
    const hues = [200, 220, 260, 300, 340, 20, 45, 160];
    const h = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${h} 80% 60%)`;
  }

  // Simple event subscription for connection lifecycle
  public on(event: 'connected', handler: () => void): () => void;
  public on(event: 'disconnected', handler: () => void): () => void;
  public on(event: 'error', handler: (message?: string) => void): () => void;
  public on(event: 'connected' | 'disconnected' | 'error', handler: any): () => void {
    const set = this.eventHandlers[event as keyof typeof this.eventHandlers] as Set<any>;
    set.add(handler);
    return () => set.delete(handler);
  }
}

export default RealtimeClient;


