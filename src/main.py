import argparse
from transcriptor import Transcriptor


def main():
    parser = argparse.ArgumentParser(description="Transcribe an audio file.")
    parser.add_argument(
        "--audio-file", required=True, help="Path to the audio file to transcribe."
    )
    args = parser.parse_args()

    transcriptor = Transcriptor()
    text = transcriptor.transcribe(args.audio_file)
    print(text)


if __name__ == "__main__":
    main()
