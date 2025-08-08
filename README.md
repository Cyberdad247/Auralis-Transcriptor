# Auralis-Transcriptor

Auralis-Transcriptor is an open-source audio transcription service. It takes an audio file as input and returns the transcribed text.

## Features

- Transcribe audio files (e.g., `.wav`, `.mp3`).
- Simple and easy-to-use API.

## Getting Started

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
