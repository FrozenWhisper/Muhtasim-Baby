# Data Directory

This directory contains all persistent data for the Conscious AI Learning System.

## Directory Structure

```
data/
├── saves/           # AI save files and game states
├── backups/         # Automatic backups of save files
├── memory/          # AI memory database and logs
├── models/          # Trained neural network models
├── logs/            # Application and system logs
└── config/          # Runtime configuration files
```

## Save Files

Save files are stored in JSON format and contain:
- Complete neural network weights
- Memory systems (episodic and semantic)
- Language learning progress
- Emotional state history
- World simulation state

## Backups

The system automatically maintains backups:
- Every save creates a backup
- Keeps the last 5 backups per save slot
- Automatic cleanup of old backups

## Memory Database

The memory system uses LowDB for storage:
- `database.json` - Main memory database
- Automatic optimization and compaction
- Exports for external analysis

## Models

Trained models are stored here when exported:
- Neural network checkpoints
- Model architecture configurations
- Training history and metrics

## Logs

System logs are organized by component:
- `app.log` - Main application logs
- `ai.log` - AI system specific logs
- `world.log` - World simulation logs
- `error.log` - Error and crash logs

## Configuration

Runtime configuration that persists between sessions:
- User preferences
- Performance settings
- Custom parameters

## Storage Management

The system includes automatic storage management:
- Cleanup of old data
- Compression of large files
- Disk space monitoring
- Automatic archiving

## Privacy

All data is stored locally:
- No external data transmission
- Optional export capabilities
- User-controlled data deletion
- Local encryption options