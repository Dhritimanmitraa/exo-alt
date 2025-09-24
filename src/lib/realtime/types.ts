// Core branded ID types for stronger nominal typing
export type UserId = string & { readonly __brand: 'UserId' };
export type RoomId = string & { readonly __brand: 'RoomId' };
export type PlanetId = string & { readonly __brand: 'PlanetId' };

// Presence description for each participant
export interface UserPresence {
  id: UserId;
  name: string;
  color: string;
  joinedAt: number;
  lastSeen: number;
  selectedPlanetId?: PlanetId;
  isViewingPlanet?: PlanetId;
}

// Camera state used for synchronization
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  timestamp: number;
}

// Client -> Server messages
export type JoinRoomMessage = {
  type: 'join';
  roomId: string; // RoomId as string
  user: UserPresence;
};

export type LeaveRoomMessage = {
  type: 'leave';
  userId: string; // UserId as string
};

export type SelectPlanetMessage = {
  type: 'select';
  planetId: string; // PlanetId as string
  userId: string; // UserId as string
};

export type UnselectPlanetMessage = {
  type: 'unselect';
  planetId: string;
  userId: string;
};

export type JoinViewerMessage = {
  type: 'join_viewer';
  planetId: string;
  userId: string;
};

export type LeaveViewerMessage = {
  type: 'leave_viewer';
  planetId: string;
  userId: string;
};

export type CameraUpdateMessage = {
  type: 'camera';
  planetId: string;
  camera: CameraState;
  userId: string;
};

export type PresenceHeartbeatMessage = {
  type: 'heartbeat';
  userId: string;
  ts: number;
};

export type RealtimeClientMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | SelectPlanetMessage
  | UnselectPlanetMessage
  | JoinViewerMessage
  | LeaveViewerMessage
  | CameraUpdateMessage
  | PresenceHeartbeatMessage;

// Server -> Client messages
export type PresenceUpdateMessage = {
  type: 'presence';
  users: UserPresence[];
};

export type ConflictMessage = {
  type: 'conflict';
  planetId: string;
  lockedBy: string; // userId of locker
  reason?: string;
};

export type AckMessage = {
  type: 'ack';
  op: string;
  ok: true;
  ts?: number;
};

export type ErrorMessage = {
  type: 'error';
  op?: string;
  ok: false;
  code?: string;
  message: string;
};

export type SelectionStateMessage = {
  type: 'selection_state';
  // map planetId -> array of userIds
  selected: Record<string, string[]>;
};

export type ViewerCamerasMessage = {
  type: 'viewer_cameras';
  planetId: string;
  cameras: Record<string, CameraState>; // userId -> camera
};

export type ServerCameraUpdateMessage = {
  type: 'camera';
  planetId: string;
  camera: CameraState;
  userId: string;
};

export type RealtimeServerMessage =
  | PresenceUpdateMessage
  | ConflictMessage
  | AckMessage
  | ErrorMessage
  | SelectionStateMessage
  | ViewerCamerasMessage
  | ServerCameraUpdateMessage;

// Helper types for UI
export interface ConflictInfo {
  planetId: PlanetId;
  lockedBy: string;
  reason?: string;
}


