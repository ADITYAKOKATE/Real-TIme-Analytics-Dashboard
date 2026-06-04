# PulseMetrics — Real-Time Analytics Dashboard

A production-grade analytics platform built with the MERN stack + Kafka + Redis + D3.js.

## 🏗 Architecture

```
PROJECT 3/
├── apps/
│   ├── server/          # Node.js + Express + TypeScript backend
│   │   └── src/
│   │       ├── kafka/          # Producer, Consumer, Validator, Enricher, Aggregator
│   │       ├── models/         # Mongoose models (Metric, Alert, Dashboard)
│   │       ├── routes/         # REST API routes
│   │       ├── socket/         # Socket.io manager + Redis buffering
│   │       ├── workers/        # BullMQ alert evaluation worker
│   │       └── scripts/        # Seed event generator
│   └── client/          # Next.js 14 + Tailwind + TypeScript frontend
│       └── src/
│           ├── app/            # Next.js App Router pages
│           ├── components/     # UI + Charts (D3.js) + Layout components
│           ├── contexts/       # Socket.io React context
│           └── hooks/          # useD3, useMetrics data hooks
└── packages/
    └── shared/          # Shared TypeScript types (events, alerts, dashboards)
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Event Ingestion | Kafka (kafkajs) with Ajv schema validation |
| Data Storage | MongoDB Timeseries Collections |
| Caching & Buffer | Redis (ioredis) |
| Live Updates | Socket.io |
| Job Queue | BullMQ |
| API | Express.js REST |
| Frontend | Next.js 14 + React |
| Charts | D3.js (custom hooks) |
| Dashboard Builder | react-grid-layout |
| Styling | Tailwind CSS (dark theme) |

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Docker Desktop

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **Kafka** on `localhost:9092`
- **Kafka UI** on `http://localhost:8080`
- **MongoDB** on `localhost:27017`
- **Redis** on `localhost:6379`

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Servers

```bash
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health check**: http://localhost:4000/health

### 4. Seed Demo Data (Optional)

```bash
npm run seed --workspace=apps/server
```

This publishes 500 realistic events across all 5 event types to Kafka.

## 📊 Features

### Event Ingestion (Kafka)
- 5 Kafka topics: `page_views`, `clicks`, `conversions`, `api_calls`, `errors`
- Schema validation with **Ajv** — invalid events routed to DLQ
- User-agent enrichment with **ua-parser-js**
- 1-minute tumbling window aggregation before MongoDB write
- `userId` as partition key for ordering

### MongoDB Timeseries
- Native timeseries collection (`timeField: timestamp`, `metaField: metadata`, `granularity: minutes`)
- Auto TTL: 7 days for raw data, 90 days for hourly rollups
- Efficient `$match` + `$group` aggregation pipeline queries

### WebSocket Live Updates
- Socket.io with room-based selective subscriptions (`metric:{type}`)
- **Redis buffer**: last 60 seconds of events replayed on reconnect
- 5-second heartbeat for connection freshness
- Immediate emit on any event ingestion

### Alert Rules (BullMQ)
- Configure rules: `{metric, operator, threshold, windowMinutes, channels}`
- Evaluates every 60 seconds against MongoDB aggregates
- **30-minute cooldown** deduplication
- Recovery alerts when condition resolves
- Channels: email, Slack, webhook (pluggable)

### D3.js Charts
- **Line Chart** — timeseries with gradient area fill + zoom tooltip
- **Bar Chart** — comparison with bounce animation
- **Heatmap** — hour × day activity matrix
- **Pie/Donut** — event distribution with arc animation
- All charts: responsive (ResizeObserver), animated transitions

### Dashboard Builder
- Drag-and-drop widgets with `react-grid-layout`
- Widget types: KPI, Line, Bar, Pie, Alert Feed
- Layouts saved to MongoDB
- Public share via token-based embed URL

## 🔌 API Reference

```
GET  /health
POST /api/events            — Ingest single event
POST /api/events/batch      — Batch ingest

GET  /api/metrics/timeseries?eventType=&from=&to=&granularity=
GET  /api/metrics/summary
GET  /api/metrics/heatmap?eventType=

GET  /api/alerts/rules
POST /api/alerts/rules
PUT  /api/alerts/rules/:id
DEL  /api/alerts/rules/:id
POST /api/alerts/rules/:id/mute
GET  /api/alerts/history

GET  /api/dashboards
POST /api/dashboards
PUT  /api/dashboards/:id
POST /api/dashboards/:id/share
GET  /api/dashboards/share/:token
```
