import wave
import os


def create_silent_wav(file_path, duration=1, sample_rate=44100):
    """
    Creates a silent WAV file.
    """
    with wave.open(file_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        # Write no frames for silence
        wf.writeframes(b"")


if __name__ == "__main__":
    # The tests directory should already exist, but this is safe
    if not os.path.exists("tests"):
        os.makedirs("tests")
    create_silent_wav("tests/silent.wav")
