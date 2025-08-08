import speech_recognition as sr
from src.transcriptor import Transcriptor


def test_transcribe_success(monkeypatch):
    """
    Test successful transcription.
    """

    def mock_recognize_sphinx(*args, **kwargs):
        return "hello world"

    monkeypatch.setattr(sr.Recognizer, "recognize_sphinx", mock_recognize_sphinx)

    # A file path is needed for sr.AudioFile, but the mocked method won't process it.
    transcriptor = Transcriptor()
    result = transcriptor.transcribe("tests/silent.wav")
    assert result == "hello world"


def test_transcribe_unknown_value_error(monkeypatch):
    """
    Test the case where Sphinx cannot understand the audio.
    """

    def mock_recognize_sphinx(*args, **kwargs):
        raise sr.UnknownValueError()

    monkeypatch.setattr(sr.Recognizer, "recognize_sphinx", mock_recognize_sphinx)

    transcriptor = Transcriptor()
    result = transcriptor.transcribe("tests/silent.wav")
    assert result == "Sphinx could not understand audio"
