# Realtime WebSocket Server Specification

This document describes the signaling server required for ExoArchive Pocket realtime features.

## Architecture

- Node.js WebSocket server using `ws`
- Room-based model; a room groups users by exploration session
- In-memory state for presence, selections, and viewer cameras
- Optional HTTP health-check endpoint (`GET /health` → `{ ok: true }`)

## Message Protocol

All messages are JSON objects with a `type` field. The following types are used by the client and must be supported by the server.

### Client → Server

- `join`: `{ type: 'join', roomId: string, user: UserPresence }`
- `leave`: `{ type: 'leave', userId: string }`
- `select`: `{ type: 'select', planetId: string, userId: string }`
- `unselect`: `{ type: 'unselect', planetId: string, userId: string }`
- `join_viewer`: `{ type: 'join_viewer', planetId: string, userId: string }`
- `leave_viewer`: `{ type: 'leave_viewer', planetId: string, userId: string }`
- `camera`: `{ type: 'camera', planetId: string, camera: CameraState, userId: string }`
- `heartbeat`: `{ type: 'heartbeat', userId: string, ts: number }`

### Server → Client

- `presence`: `{ type: 'presence', users: UserPresence[] }`
- `selection_state`: `{ type: 'selection_state', selected: Record<string, string[]> }`
- `viewer_cameras`: `{ type: 'viewer_cameras', planetId: string, cameras: Record<string, CameraState> }`
- `camera`: `{ type: 'camera', planetId: string, camera: CameraState, userId: string }`
- `conflict`: `{ type: 'conflict', planetId: string, lockedBy: string, reason?: string }`
- `ack`: `{ type: 'ack', op: string, ok: true, ts?: number }`
- `error`: `{ type: 'error', op?: string, ok: false, code?: string, message: string }`

## Room Management

- Create room on first `join`
- Remove room when last user disconnects
- Limit users per room (default 20)
- Persist minimal state in-memory; no DB required

## Planet Selection & Conflict Resolution

- Maintain `selected: Map<planetId, Set<userId>>`
- First-come-first-served lock when user opens planet details; server can emit `conflict` if planet locked by another user
- Optional temporary locks with TTL (default 5 minutes) and renewal via `heartbeat`
- Broadcast `selection_state` to all room members on changes

## Viewer Cameras

- Track per-planet viewer participants and their last camera state
- On `join_viewer`, add user and emit `viewer_cameras` to the joiner
- Broadcast `camera` updates to other users viewing the same planet (throttle if necessary)

## Presence & Heartbeats

- Track `lastSeen` timestamps per user
- Heartbeat expected every 30s; remove user after grace period (e.g., 90s)
- Broadcast `presence` on join/leave/update

## Security & Limits

- Rate-limit per-connection messages (e.g., 60 msg/10s)
- Validate all incoming payloads and types
- CORS acceptable for WebSocket upgrade
- Optional token auth hook for future integration

## Deployment

- Configure `WS_PORT`, `HEALTH_PORT`, `MAX_ROOM_USERS`
- Dockerize server and expose ports
- For scale-out, use sticky sessions or a shared state layer (e.g., Redis) for rooms
- Monitor with basic logs and health checks

## Example Flows

### Join Room

1. Client sends `join`
2. Server adds user to room and broadcasts `presence`
3. Server sends current `selection_state`

### Select Planet

1. Client sends `select`
2. Server updates selected set and broadcasts `selection_state`
3. If locked by another user, server sends `conflict`

### Camera Sync

1. Client sends `join_viewer`
2. Server replies with `viewer_cameras` snapshot
3. Clients send `camera` updates; server rebroadcasts to other viewers


