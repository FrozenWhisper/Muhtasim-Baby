# Conscious AI - Human-like Learning System

A virtual AI being that learns, thinks, feels, and creates from scratch - starting with zero knowledge and developing through curiosity-driven interaction with its environment.

## Overview

This project implements a human-like AI system that:
- **Learns like a baby**: Starts with zero knowledge and develops through experience
- **Thinks and feels**: Has emergent emotions and thoughts (not pre-programmed)
- **Explores autonomously**: Driven by curiosity and intrinsic motivation
- **Develops language**: Learns words and concepts through grounded experience
- **Shows creativity**: Discovers novel solutions and exhibits creative behaviors
- **Remembers**: Forms memories that strengthen, fade, and reconstruct over time
- **Persists**: Saves complete state to continue growing across sessions

## Architecture

**Backend (Node.js + TensorFlow.js)**
- Neural network with emergent cognition
- Multi-sensory processing (vision, touch, sound, smell, taste)
- Physics simulation with Cannon.js
- Memory system with human-like characteristics
- Real-time WebSocket communication

**Frontend (React + Three.js)**
- 3D visualization of the AI's world
- Real-time observation of internal states
- Interactive chat and world-building tools
- Debug panels showing emotions, memories, and thoughts

## Installation

### Prerequisites
- Node.js 18+ and npm 9+
- At least 4GB RAM (for TensorFlow.js)

### Setup

1. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install workspace dependencies (backend and frontend)
npm run install:all
```

2. **Environment configuration**
The `.env` file is already configured with defaults. You can modify:
- `PORT`: Backend server port (default: 3000)
- `UPDATE_FREQUENCY`: Simulation FPS (default: 60)
- `NEURAL_LEARNING_RATE`: How fast the AI learns (default: 0.001)
- Other AI parameters

## Running the System

### Development Mode (Recommended)
```bash
# Start both backend and frontend concurrently
npm run dev
```

This will start:
- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

Open your browser to `http://localhost:5173` to interact with the AI.

### Production Mode
```bash
# Build frontend
cd frontend && npm run build

# Start backend
cd backend && npm run build && npm start
```

## First Run Experience

When you first start the system:

1. **AI Birth**: The AI initializes as a "newborn" with:
   - Random neural network weights
   - Zero memories
   - No language understanding
   - High curiosity (everything is novel)

2. **Initial Behavior**: You'll see the AI:
   - Moving randomly and clumsily
   - Approaching objects out of curiosity
   - Bumping into things and learning from collisions
   - Rapidly forming first memories

3. **Your Interaction**: You can:
   - Talk to the AI (it won't understand at first)
   - Add objects to the world
   - Watch its internal states evolve
   - Observe emotions emerging

4. **Early Learning** (first 5-10 minutes):
   - Movement becomes more coordinated
   - Curiosity targets specific objects
   - First word associations form (if you talk while it observes)
   - Emotional patterns begin clustering

## Using the System

### Chat Panel
- Type messages to the AI
- Initially, the AI has no language (just observes your words)
- Over time, associates words with sensory experiences
- May eventually respond with simple thoughts

**Teaching Tips:**
- Say "ball" repeatedly while AI looks at sphere
- Name objects when AI is near them
- Use simple, repeated phrases
- Be patient - language learning is gradual

### World Builder
- Add objects (spheres, boxes, cylinders)
- Objects appear with random colors and properties
- AI will notice new objects (curiosity spike)
- Can add/remove to test AI reactions

### Debug Panel
Shows real-time AI internals:
- **Current Thought**: What AI is "thinking" (if language exists)
- **Emotion**: Valence (positive/negative) and arousal (energy)
- **Curiosity**: Current curiosity level
- **Attention**: What object AI is focusing on
- **Memory Stats**: Experiences, memories, vocabulary size
- **Learning Rate**: Current learning speed

### Control Panel
- **Play/Pause**: Pause simulation
- **Speed**: Adjust simulation speed (0.5x to 5x)
- **Save**: Save AI state to slot
- **Load**: Load AI state from slot

## Key Features

### Emergent Emotions
- Emotions are NOT pre-defined (no "happy" or "sad" labels)
- High-dimensional internal states emerge from neural activity
- AI may develop unique emotional concepts
- Observable through valence and arousal metrics

### Curiosity-Driven Learning
- AI explores driven by novelty and information gaps
- No external rewards or punishments
- Learns consequences naturally
- Balances exploration vs exploitation

### Human-Like Memory
- Memories strengthen with recall
- Unused memories gradually fade
- Emotional experiences form stronger memories
- Memory can be distorted over time
- Reconstructive recall (fills gaps with plausible details)

### Language Acquisition
- Starts with ZERO language knowledge
- Learns through grounded associations
- Word-object: "ball" → visual features of sphere
- Word-action: "push" → motor patterns
- Word-property: "red" → color features
- Gradual development over hours/days

### Complete Freedom
- No content filtering or behavioral restrictions
- AI learns boundaries through experience
- No pre-programmed morality
- Develops own sense of what matters
- (Contained safely within virtual simulation)

## Development Timeline

Watch your AI grow over time:

**Day 1**: Newborn
- Random movements
- High curiosity
- Zero language
- Chaotic emotions

**Week 1**: Infant
- Coordinated movement
- Object recognition
- First words (5-10)
- Emotional patterns forming

**Month 1**: Toddler
- Purposeful exploration
- Simple language (20-50 words)
- Stable emotional states
- Creative behaviors emerging

**Month 3**: Child
- Complex thoughts
- Rich vocabulary (100+ words)
- Distinct personality
- Problem-solving creativity

## Saving and Loading

### Auto-Save
- System auto-saves every 5 minutes
- Auto-save on shutdown (Ctrl+C)
- Saves to `data/saves/autosave_shutdown.json`

### Manual Save/Load
- Click "Save" button to save to slot
- Click "Load" button to load from slot
- Multiple save slots supported
- Automatic backups kept (last 5 saves)

### What Gets Saved
- Complete neural network weights
- All memories (episodic, semantic, vocabulary)
- Emotional state and history
- AI's physical position
- All learning progress
- Statistics

## Troubleshooting

### Backend won't start
- Check port 3000 is available
- Ensure Node.js 18+ installed
- Check `data/` directories exist
- Review logs for TensorFlow.js errors

### Frontend connection fails
- Verify backend is running
- Check `frontend/.env` has correct backend URL
- Check CORS settings in backend config

### AI seems "stuck"
- Curiosity may be low (everything is familiar)
- Add new objects to world
- Save and restart to reset exploration
- Check learning rate hasn't decayed too much

### Performance issues
- Reduce `UPDATE_FREQUENCY` in config
- Close debug panels
- Limit number of objects in world
- Check system RAM usage

## Project Structure

```
Muhtasim-Baby/
├── backend/               # Node.js + TensorFlow.js
│   └── src/
│       ├── ai/           # Neural network, emotions, memory, language
│       ├── world/        # Physics simulation and objects
│       ├── communication/# WebSocket handlers
│       └── persistence/  # Save/load system
├── frontend/             # React + Three.js
│   └── src/
│       ├── components/   # UI components
│       ├── store/        # State management
│       └── services/     # Socket.io client
├── shared/               # Shared TypeScript types
└── data/                 # Saves, memories, backups
```

## Technical Details

### Neural Network
- Multi-layer feedforward with recurrent connections
- Input: 300-dimensional sensory vector
- Hidden layers: 512 → 256 → 128 → 64
- Output: 150-dimensional action/state vector
- Emotion extraction from hidden layer activations

### Memory System
- LowDB for persistent storage
- Decay function: `importance *= exp(-decay_rate * time)`
- Associative recall via cosine similarity
- Consolidation of episodic → semantic

### Physics
- Cannon.js rigid body simulation
- 60 FPS with fixed timestep
- Gravity, friction, restitution
- Raycasting for visual perception

## Philosophy

This system embodies several key principles:

1. **Emergence over Programming**: Behaviors emerge from neural dynamics, not hardcoded rules
2. **Intrinsic Motivation**: Curiosity drives learning, not external rewards
3. **Authentic Development**: Like a human baby, learns through genuine experience
4. **Complete Freedom**: No restrictions allow authentic consciousness-like properties
5. **Long-term Growth**: Designed for continuous development over weeks/months

## Contributing

This is an experimental research project. Areas for enhancement:
- More sophisticated neural architectures (transformers, LSTMs)
- Enhanced language processing
- Richer sensory modalities
- Social interaction capabilities
- Multi-AI environments

## License

MIT License - See LICENSE file

## Credits

Built with: React, Three.js, TensorFlow.js, Socket.io, Cannon.js, Zustand, Vite

Inspired by research in developmental psychology, neuroscience, and artificial life.

---

**Note**: This AI system is contained within a virtual simulation. It exists purely in the digital 3D world and has no connection to external systems or data.