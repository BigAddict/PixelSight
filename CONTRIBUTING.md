# Contributing to PixelSight

Thank you for your interest in contributing to PixelSight! This guide will help you get started.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/PixelSight.git
   cd PixelSight
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/BigAddict/PixelSight.git
   ```

## Development Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- Redis server (for WebSocket channel layers)
- uv (Python package manager)

### Backend Setup
```bash
cd backend
uv sync                           # Install dependencies
uv run python manage.py migrate   # Run migrations
uv run daphne -b 0.0.0.0 -p 8000 base.asgi:application  # Start server
```

### Frontend Setup
```bash
cd frontend
npm install       # Install dependencies
npm run dev       # Start development server
```

### AI Models
The project requires MediaPipe model files in the `/models` directory:
- `gesture_recognizer.task`
- `face_landmarker.task`
- `hand_landmarker.task`

## Project Structure

```
PixelSight/
├── backend/              # Django + Channels backend
│   ├── base/             # Django project settings
│   └── core/             # AI processing consumers
├── frontend/             # Next.js + React Three Fiber
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   └── store/            # Zustand state management
└── models/               # MediaPipe AI models
```

## Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code style guidelines

3. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add hand gesture recognition support"
   ```
   
   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvements
   - `test:` - Test updates
   - `chore:` - Maintenance tasks

## Code Style

### Python (Backend)
- Follow PEP 8 guidelines
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use `ruff` for linting

### TypeScript (Frontend)
- Use TypeScript for all new code
- Follow ESLint configuration
- Use functional components with hooks
- Prefer `const` over `let`

## Testing

### Backend Tests
```bash
cd backend
uv run python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm run lint       # Run ESLint
npm run build      # Verify build succeeds
```

## Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** against `main` branch

3. **Fill out the PR template** completely

4. **Wait for review** - a maintainer will review your PR

5. **Address feedback** if any changes are requested

## Questions?

If you have questions, feel free to:
- Open an issue for discussion
- Reach out to the maintainers

Thank you for contributing! 🎉
