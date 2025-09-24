import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import RealtimeClient from './RealtimeClient';
import type { CameraState, PlanetId, UserId, UserPresence } from './types';
import type { ConflictInfo } from './types';

type PlanetIdString = string; // prop-level string id for ease of integration

export interface RealtimeContextValue {
  isConnected: boolean;
  currentUser: UserPresence | null;
  peers: UserPresence[];
  selectedPlanets: Map<PlanetId, UserId[]>;
  camerasInPlanet: Map<PlanetId, Map<UserId, CameraState>>;
  connectionError: string | null;
  lastConflict: ConflictInfo | null;
  // actions
  selectPlanet(planetId: PlanetIdString): Promise<boolean>;
  unselectPlanet(planetId: PlanetIdString): void;
  updateCamera(planetId: PlanetIdString, camera: CameraState): void;
  joinPlanetViewer(planetId: PlanetIdString): void;
  leavePlanetViewer(planetId?: PlanetIdString): void;
  retryConnection(): void;
  clearConflict(): void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}

interface ProviderProps {
  roomId: string;
  children: React.ReactNode;
  url?: string;
}

export function RealtimeProvider({ roomId, children, url }: ProviderProps) {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const [peers, setPeers] = useState<UserPresence[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedPlanets, setSelectedPlanets] = useState<Map<PlanetId, UserId[]>>(new Map());
  const [camerasInPlanet, setCamerasInPlanet] = useState<Map<PlanetId, Map<UserId, CameraState>>>(new Map());
  const [lastConflict, setLastConflict] = useState<ConflictInfo | null>(null);
  const lastSelectAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    const client = new RealtimeClient({ url, roomId });
    clientRef.current = client;
    client.connect(roomId).then(() => {
      setCurrentUser(client.getCurrentUser());
    }).catch((e) => {
      setConnectionError('Failed to connect to realtime server');
      setIsConnected(false);
    });

    const offConnected = client.on('connected', () => {
      setIsConnected(true);
      setConnectionError(null);
    });
    const offDisconnected = client.on('disconnected', () => {
      setIsConnected(false);
    });
    const offError = client.on('error', (msg?: string) => {
      setConnectionError(msg || 'Realtime error');
    });

    const unsubPresence = client.subscribe('presence', (msg) => {
      setPeers(msg.users);
    });

    const unsubSelection = client.subscribe('selection_state', (msg) => {
      const m = new Map<PlanetId, UserId[]>();
      for (const [pid, arr] of Object.entries(msg.selected)) {
        m.set(pid as PlanetId, arr as unknown as UserId[]);
      }
      setSelectedPlanets(m);
    });

    const unsubError = client.subscribe('error', (msg) => {
      setConnectionError(msg.message || 'Realtime error');
    });

    const unsubAck = client.subscribe('ack', () => {
      // no-op for now
    });

    const unsubCamera = client.subscribe('camera', (msg) => {
      setCamerasInPlanet((prev) => {
        const next = new Map(prev);
        const planetKey = msg.planetId as PlanetId;
        const inner = new Map(next.get(planetKey) || []);
        inner.set(msg.userId as unknown as UserId, msg.camera);
        next.set(planetKey, inner);
        return next;
      });
    });

    const unsubViewerCameras = client.subscribe('viewer_cameras', (msg) => {
      setCamerasInPlanet((prev) => {
        const next = new Map(prev);
        const planetKey = msg.planetId as PlanetId;
        const inner = new Map<UserId, CameraState>();
        for (const [uid, cam] of Object.entries(msg.cameras)) {
          inner.set(uid as unknown as UserId, cam);
        }
        next.set(planetKey, inner);
        return next;
      });
    });

    const unsubConflict = client.subscribe('conflict', (msg) => {
      const me = client.getCurrentUser();
      if (!me) return;
      if (lastSelectAttemptRef.current && String(msg.planetId) === String(lastSelectAttemptRef.current)) {
        setSelectedPlanets((prev) => {
          const next = new Map(prev);
          const key = msg.planetId as unknown as PlanetId;
          const list = (next.get(key) || []).filter((u) => String(u) !== String(me.id));
          if (list.length === 0) next.delete(key); else next.set(key, list as UserId[]);
          return next;
        });
        client.updatePresence({ selectedPlanetId: undefined });
        setLastConflict({ planetId: msg.planetId as unknown as PlanetId, lockedBy: msg.lockedBy, reason: msg.reason });
        lastSelectAttemptRef.current = null;
      }
    });

    return () => {
      unsubPresence();
      unsubSelection();
      unsubError();
      unsubAck();
      unsubCamera();
      unsubViewerCameras();
      unsubConflict();
      offConnected();
      offDisconnected();
      offError();
      client.disconnect();
    };
  }, [roomId, url]);

  const selectPlanet = useCallback(async (planetId: PlanetIdString): Promise<boolean> => {
    const client = clientRef.current;
    if (!client) return false;
    const me = client.getCurrentUser();
    if (!me) return false;
    // optimistic: add self to selected set
    setSelectedPlanets((prev) => {
      const next = new Map(prev);
      const key = planetId as unknown as PlanetId;
      const list = (next.get(key) || []).slice();
      if (!list.includes(me.id as unknown as UserId)) list.push(me.id as unknown as UserId);
      next.set(key, list);
      return next;
    });
    lastSelectAttemptRef.current = String(planetId);
    client.updatePresence({ selectedPlanetId: planetId as unknown as PlanetId });
    client.send({ type: 'select', planetId: String(planetId), userId: String(me.id) });
    // Assume success; conflicts will be notified by server via 'conflict'
    return true;
  }, []);

  const unselectPlanet = useCallback((planetId: PlanetIdString) => {
    const client = clientRef.current;
    if (!client) return;
    const me = client.getCurrentUser();
    if (!me) return;
    setSelectedPlanets((prev) => {
      const next = new Map(prev);
      const key = planetId as unknown as PlanetId;
      const list = (next.get(key) || []).filter((u) => String(u) !== String(me.id));
      if (list.length === 0) next.delete(key); else next.set(key, list as UserId[]);
      return next;
    });
    client.updatePresence({ selectedPlanetId: undefined });
    client.send({ type: 'unselect', planetId: String(planetId), userId: String(me.id) });
  }, []);

  const updateCamera = useCallback((planetId: PlanetIdString, camera: CameraState) => {
    const client = clientRef.current;
    if (!client) return;
    client.sendCamera(planetId, camera);
  }, []);

  const joinPlanetViewer = useCallback((planetId: PlanetIdString) => {
    const client = clientRef.current;
    if (!client) return;
    const me = client.getCurrentUser();
    if (!me) return;
    client.updatePresence({ isViewingPlanet: planetId as unknown as PlanetId });
    client.send({ type: 'join_viewer', planetId: String(planetId), userId: String(me.id) });
  }, []);

  const leavePlanetViewer = useCallback((planetId?: PlanetIdString) => {
    const client = clientRef.current;
    if (!client) return;
    const me = client.getCurrentUser();
    if (!me) return;
    const pid = planetId || (me.isViewingPlanet as unknown as string | undefined);
    client.updatePresence({ isViewingPlanet: undefined });
    if (pid) client.send({ type: 'leave_viewer', planetId: String(pid), userId: String(me.id) });
    if (pid) {
      setCamerasInPlanet((prev) => {
        const next = new Map(prev);
        const key = pid as unknown as PlanetId;
        const inner = new Map(next.get(key) || []);
        inner.delete(me.id as unknown as UserId);
        if (inner.size === 0) next.delete(key); else next.set(key, inner);
        return next;
      });
    }
  }, []);

  const retryConnection = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.reconnect().then(() => {
      setIsConnected(client.isConnected());
      setConnectionError(null);
    }).catch(() => setConnectionError('Failed to reconnect'));
  }, []);

  const clearConflict = useCallback(() => {
    setLastConflict(null);
  }, []);

  const value = useMemo<RealtimeContextValue>(() => ({
    isConnected,
    currentUser,
    peers,
    selectedPlanets,
    camerasInPlanet,
    connectionError,
    lastConflict,
    selectPlanet,
    unselectPlanet,
    updateCamera,
    joinPlanetViewer,
    leavePlanetViewer,
    retryConnection,
    clearConflict,
  }), [isConnected, currentUser, peers, selectedPlanets, camerasInPlanet, connectionError, lastConflict, selectPlanet, unselectPlanet, updateCamera, joinPlanetViewer, leavePlanetViewer, retryConnection, clearConflict]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export default RealtimeContext;


