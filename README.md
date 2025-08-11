# Auralis-Transcriptor

Auralis-Transcriptor is an open-source audio transcription service. It takes an audio file as input and returns the transcribed text.

## Features

- Transcribe audio files (e.g., `.wav`, `.mp3`).
- Simple and easy-to-use API.

## Getting Started

### Quick local run (Docker + local ASR)

1) Download a small Vosk model into ./models/vosk:
- Windows (PowerShell):
  pwsh -File scripts\download_vosk_model.ps1
- macOS/Linux:
  bash scripts/download_vosk_model.sh

2) Start the stack:
- docker-compose up -d

This brings up:
- Postgres (db)
- Backend (Node, provider default: whispercpp via python-services adapters)
- Python services (ASR/TTS adapters, health: http://localhost:8000/health)
- Frontend (Vite dev server: http://localhost:3000)

Switch provider to Vosk:
- In docker-compose.yml backend section, set:
  TRANSCRIPTION_PROVIDER: vosk
  VOSK_URL: http://python-services:8000/adapters/vosk

Use LocalAI (OpenAI-compatible):
- Run LocalAI with Whisper model, then set env for backend:
  OPENAI_BASE_URL: http://host.docker.internal:8080/v1
  OPENAI_API_KEY: sk-local
  TRANSCRIPTION_PROVIDER: openai-whisper

### Prerequisites

- Python 3.8+
- Pip

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/example/Auralis-Transcriptor.git
    cd Auralis-Transcriptor
    ```
2.  Install the dependencies:
    ```sh
    pip install -r requirements.txt
    ```

## Usage

To use the transcriptor, you can run the main script from the command line:

```sh
python src/main.py --audio-file path/to/your/audio.wav
```

Alternatively, you can use it as a library in your Python code:

```python
from src.transcriptor import Transcriptor

transcriptor = Transcriptor()
text = transcriptor.transcribe("path/to/your/audio.wav")
print(text)
```

## Running Tests

To run the tests, use `pytest`:

```sh
pytest
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
