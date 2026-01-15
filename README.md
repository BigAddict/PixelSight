# PixelSight

Real-time AI-powered hand gesture and facial expression detection with a stunning 3D visualization.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.12+-green.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)

## ✨ Features

- **Hand Gesture Recognition** - Real-time detection of hand gestures using MediaPipe
- **Facial Expression Detection** - Track facial landmarks and expressions
- **3D Visualization** - Beautiful React Three Fiber visualization with post-processing effects
- **Real-time WebSocket Streaming** - Low-latency communication between frontend and backend
- **Modern UI** - Glassmorphism design with animated overlays

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│    Frontend     │ ◄─────────────────► │     Backend     │
│  Next.js + R3F  │    (AI Results)    │ Django Channels │
│                 │                     │   + MediaPipe   │
└─────────────────┘                     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Redis server
- [uv](https://github.com/astral-sh/uv) (Python package manager)

### Backend

```bash
cd backend
uv sync
uv run daphne -b 0.0.0.0 -p 8000 base.asgi:application
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
PixelSight/
├── backend/              # Django + Channels backend
│   ├── base/             # Django project settings
│   └── core/             # AI processing consumers
├── frontend/             # Next.js + React Three Fiber
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── store/            # Zustand state management
├── models/               # MediaPipe AI models
└── .github/              # GitHub workflows & templates
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License.
