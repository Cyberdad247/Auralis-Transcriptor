import speech_recognition as sr


class Transcriptor:
    def __init__(self):
        self.recognizer = sr.Recognizer()

    def transcribe(self, audio_file_path):
        """
        Transcribes an audio file.

        :param audio_file_path: Path to the audio file (must be .wav)
        :return: Transcribed text
        """
        with sr.AudioFile(audio_file_path) as source:
            audio_data = self.recognizer.record(source)
            try:
                # Using the Sphinx recognizer (works offline)
                text = self.recognizer.recognize_sphinx(audio_data)
                return text
            except sr.UnknownValueError:
                return "Sphinx could not understand audio"
            except sr.RequestError as e:
                return f"Sphinx error; {e}"
