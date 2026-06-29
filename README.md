# 🌿 Canopy Circle — Social-Fi on Canopy Network

> **Canopy Vibe Code Contest #2 Submission**

Canopy Circle is a fully on-chain social platform built on the Canopy Network blockchain. Every social action — posting, following, creating communities, appreciating content — is a real blockchain transaction with BLS12-381 signatures.

[![Canopy Network](https://img.shields.io/badge/Built%20on-Canopy%20Network-22c55e)](https://canopy.network)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb)](https://reactjs.org/)

---

## Features

| Feature | On-chain Action | Transaction Type |
|---|---|---|
| 👤 Create Profile | Yes | `MessageCreateProfile` |
| ✏️ Update Profile | Yes | `MessageUpdateProfile` |
| 📝 Create Post | Yes | `MessageCreatePost` |
| 💬 Reply to Post | Yes | `MessageReplyPost` |
| ⭕ Create Circle | Yes | `MessageCreateCircle` |
| 🔗 Join Circle | Yes | `MessageJoinCircle` |
| 🚪 Leave Circle | Yes | `MessageLeaveCircle` |
| 👥 Follow User | Yes | `MessageFollowUser` |
| 👋 Unfollow User | Yes | `MessageUnfollowUser` |
| ❤️ Appreciate Post | Yes | `MessageAppreciatePost` |
| 🔖 Bookmark Post | Yes | `MessageBookmarkPost` |
| 💸 Send Tokens | Yes | `MessageSend` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Canopy Circle                             │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │    Proxy     │    │    Plugin    │  │
│  │  React+Vite  │───▶│   Express    │───▶│  TypeScript  │  │
│  │  :5173       │    │   :3001      │    │              │  │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘  │
│                             │                    │          │
│                             ▼                    ▼          │
│                   ┌──────────────────────────────────────┐  │
│                   │         Canopy Node                  │  │
│                   │  Query RPC :50002  Admin RPC :50003  │  │
│                   │  Plugin Socket: /tmp/plugin/plugin.sock│ │
│                   └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components

- **`plugin/`** — Canopy TypeScript plugin with 11 custom social-fi transaction types
- **`proxy/`** — Express.js bridge server that handles BLS12-381 signing and proxies to Canopy RPC
- **`frontend/`** — React + Vite social platform UI with green glassmorphism design

### State Key Prefixes

All plugin state uses prefixes > 15 to avoid collision with Canopy core (1-15):

| Prefix | Data |
|--------|------|
| `[20]` | Profile |
| `[21]` | Post |
| `[22]` | Post-by-Author index |
| `[23]` | Circle |
| `[24]` | Circle membership |
| `[25]` | Follow (follower → followee) |
| `[26]` | Follower index (followee → follower) |
| `[27]` | Appreciate record |
| `[28]` | Bookmark record |
| `[29]` | Reply |
| `[30]` | Notification |
| `[31]` | Post-by-Circle index |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A running Canopy node with your plugin registered
- The plugin process connected via Unix socket

### 1. Build & run the Plugin

```bash
cd plugin
make build-all     # install + proto + descriptors + TypeScript
make run           # starts the plugin, connects to Canopy via Unix socket

# Plugin exposes custom RPC on :50010
# GET http://localhost:50010/v1/health
# GET http://localhost:50010/v1/query/profile/:address
# GET http://localhost:50010/v1/query/post/:postId
# GET http://localhost:50010/v1/query/circle/:circleId
# GET http://localhost:50010/v1/query/circles
# GET http://localhost:50010/v1/query/posts/author/:address
# GET http://localhost:50010/v1/query/posts/circle/:circleId
# GET http://localhost:50010/v1/query/replies/:postId
```

### 2. Start the Proxy Server

```bash
cd proxy
npm install
npm run dev        # starts on :3001

# Set environment variables if needed:
# CANOPY_QUERY_RPC=http://127.0.0.1:50002
# CANOPY_ADMIN_RPC=http://127.0.0.1:50003
# CANOPY_PLUGIN_RPC=http://127.0.0.1:50010
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev        # starts on :5173
```

Open http://localhost:5173 — create a wallet and start posting on-chain! 🌿

---

## Plugin Transaction Flow

Every social action follows this lifecycle on the Canopy FSM:

```
Browser → Proxy → Sign (BLS12-381) → POST /v1/tx → Canopy node
                                                          │
                                             FSM socket → Plugin
                                                          │
                                              CheckTx → validate
                                              DeliverTx → write state
                                                          │
                                             State committed to chain ✓
```

### Example: Creating a Profile

```typescript
// Proxy signs & submits:
POST /api/social/profile
{
  "address": "abc123...def456",
  "username": "satoshi",
  "bio": "Building on Canopy"
}

// This triggers MessageCreateProfile transaction:
// - Checks: address valid, username 3-32 alphanumeric, no duplicate
// - Delivers: writes Profile{} to state under key [20][address]
// - State key: JoinLenPrefix([20], address)
```

### Example: Following a User

```typescript
// Triggers MessageFollowUser transaction:
// - Writes follow marker under [25][follower][followee]
// - Writes follower index under [26][followee][follower]  
// - Increments follower.followingCount +1
// - Increments followee.followerCount +1
// - Boosts followee reputation +1
```

---

## Custom RPC Endpoints

The plugin exposes a read-only HTTP server at `:50010` (or `rpcAddress` in config):

```
GET /v1/health                            — node health
GET /v1/query/profile/:address            — get profile by hex address
GET /v1/query/post/:postId                — get post by ID
GET /v1/query/circle/:circleId            — get circle by ID
GET /v1/query/circles?limit=20            — list all circles
GET /v1/query/posts/author/:address?limit=20 — posts by author
GET /v1/query/posts/circle/:circleId?limit=20 — posts in circle
GET /v1/query/replies/:postId?limit=50    — replies for a post
```

All endpoints use `plugin.queryState(height, read)` for detached, read-only state queries.

---

## Proto Definitions

### Core social types (`proto/social.proto`)

```protobuf
message Profile {
  bytes address = 1;   string username = 2;   string bio = 3;
  string avatar_url = 4;   uint64 created_at = 5;
  uint64 post_count = 6;   uint64 follower_count = 7;
  uint64 following_count = 8;   uint64 reputation = 9;
}

message Post {
  string id = 1;   bytes author_address = 2;   string circle_id = 3;
  string content = 4;   uint64 created_at = 5;
  uint64 reply_count = 6;   uint64 appreciate_count = 7;
}

message Circle {
  string id = 1;   bytes creator_address = 2;   string name = 3;
  string description = 4;   string rules = 5;
  uint64 created_at = 6;   uint64 member_count = 7;
}
```

---

## Development

```bash
# Regenerate protobuf code after changing .proto files
cd plugin && make build-proto

# Full rebuild
cd plugin && make build-all

# Run tests (requires running Canopy node)
cd plugin && make test

# Type check everything
cd plugin && npx tsc --noEmit
cd proxy  && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Canopy Network |
| Plugin | TypeScript + protobufjs |
| Signing | BLS12-381 via `@noble/curves` |
| Proxy | Express.js + TypeScript |
| Frontend | React 18 + Vite + React Router |
| Styling | Custom CSS (green glassmorphism) |
| State | React Context + localStorage |

---

## Contest Details

- **Contest**: Canopy Vibe Code Contest #2
- **Category**: Social-Fi / DApp
- **Network**: Canopy Network (local dev chain)
- **Plugin**: TypeScript template extended with 11 social tx types
- **All social actions**: Real blockchain transactions

---

*Built with 🌿 for the Canopy ecosystem*
