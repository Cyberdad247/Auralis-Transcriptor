#!/usr/bin/env python3
"""
Auralis Transcriptor Python Audio Services
Advanced audio processing, transcription, and TTS services
"""

import os
import tempfile
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import speech_recognition as sr
import openai
from google.cloud import speech
import librosa
import soundfile as sf
import numpy as np
from pydub import AudioSegment
import noisereduce as nr
import webrtcvad
from gtts import gTTS
import edge_tts
import asyncio
import io
import wave
from transformers import pipeline, WhisperProcessor, WhisperForConditionalGeneration
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Auralis Transcriptor Python Services",
    description="Advanced audio processing, transcription, and TTS services",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class TranscriptionRequest(BaseModel):
    provider: str = "whisper"
    language: str = "en"
    enable_speaker_detection: bool = False
    enable_noise_reduction: bool = True

class TTSRequest(BaseModel):
    text: str
    voice: str = "en"
    provider: str = "gtts"
    speed: float = 1.0
    pitch: float = 1.0

class AudioAnalysisResponse(BaseModel):
    duration: float
    sample_rate: int
    channels: int
    noise_level: float
    speech_quality: str
    vad_segments: List[Dict[str, Any]]

class TranscriptionResponse(BaseModel):
    text: str
    confidence: float
    language: str
    duration: float
    speaker_segments: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any]

# Global services initialization
class AudioServices:
    def __init__(self):
        self.whisper_model = None
        self.whisper_processor = None
        self.speech_client = None
        self.openai_client = None
        self.vad = webrtcvad.VAD(2)  # Aggressiveness level 2
        
    async def initialize(self):
        """Initialize AI models and clients"""
        try:
            # Initialize OpenAI client
            if os.getenv("OPENAI_API_KEY"):
                self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                logger.info("OpenAI client initialized")
            
            # Initialize Google Cloud Speech client
            if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                self.speech_client = speech.SpeechClient()
                logger.info("Google Cloud Speech client initialized")
            
            # Initialize Whisper model (local)
            try:
                device = "cuda" if torch.cuda.is_available() else "cpu"
                self.whisper_processor = WhisperProcessor.from_pretrained("openai/whisper-base")
                self.whisper_model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-base").to(device)
                logger.info(f"Local Whisper model initialized on {device}")
            except Exception as e:
                logger.warning(f"Failed to initialize local Whisper model: {e}")
                
        except Exception as e:
            logger.error(f"Error initializing services: {e}")

# Global services instance
audio_services = AudioServices()

@app.on_event("startup")
async def startup_event():
    await audio_services.initialize()

@app.get("/")
async def root():
    return {"message": "Auralis Transcriptor Python Services", "status": "online"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "openai_whisper": bool(audio_services.openai_client),
            "google_speech": bool(audio_services.speech_client),
            "local_whisper": bool(audio_services.whisper_model),
            "vad": True,
            "noise_reduction": True
        }
    }

@app.post("/audio/analyze", response_model=AudioAnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    """Analyze audio file and return comprehensive audio metrics"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Load audio using librosa
        audio_data, sample_rate = librosa.load(tmp_path, sr=None)
        duration = len(audio_data) / sample_rate
        
        # Analyze noise level
        noise_level = calculate_noise_level(audio_data)
        
        # Voice Activity Detection
        vad_segments = perform_vad_analysis(tmp_path)
        
        # Assess speech quality
        speech_quality = assess_speech_quality(audio_data, noise_level, vad_segments)
        
        # Clean up
        os.unlink(tmp_path)
        
        return AudioAnalysisResponse(
            duration=duration,
            sample_rate=sample_rate,
            channels=1 if len(audio_data.shape) == 1 else audio_data.shape[1],
            noise_level=noise_level,
            speech_quality=speech_quality,
            vad_segments=vad_segments
        )
        
    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

@app.post("/audio/enhance")
async def enhance_audio(file: UploadFile = File(...)):
    """Enhance audio quality using noise reduction and normalization"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Load and enhance audio
        audio_data, sample_rate = librosa.load(tmp_path, sr=22050)
        
        # Apply noise reduction
        enhanced_audio = nr.reduce_noise(y=audio_data, sr=sample_rate)
        
        # Normalize audio
        enhanced_audio = librosa.util.normalize(enhanced_audio)
        
        # Save enhanced audio
        output_path = tmp_path.replace(".wav", "_enhanced.wav")
        sf.write(output_path, enhanced_audio, sample_rate)
        
        # Clean up original
        os.unlink(tmp_path)
        
        return FileResponse(
            output_path,
            media_type="audio/wav",
            filename="enhanced_audio.wav",
            background=lambda: os.unlink(output_path)
        )
        
    except Exception as e:
        logger.error(f"Audio enhancement failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio enhancement failed: {str(e)}")

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    provider: str = Form("whisper"),
    language: str = Form("en"),
    enable_speaker_detection: bool = Form(False),
    enable_noise_reduction: bool = Form(True)
):
    """Transcribe audio using specified provider"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Enhance audio if requested
        if enable_noise_reduction:
            audio_data, sample_rate = librosa.load(tmp_path, sr=22050)
            enhanced_audio = nr.reduce_noise(y=audio_data, sr=sample_rate)
            enhanced_path = tmp_path.replace(".wav", "_enhanced.wav")
            sf.write(enhanced_path, enhanced_audio, sample_rate)
            processing_path = enhanced_path
        else:
            processing_path = tmp_path

        # Transcribe based on provider
        if provider == "openai-whisper" and audio_services.openai_client:
            result = await transcribe_with_openai(processing_path, language)
        elif provider == "google-speech" and audio_services.speech_client:
            result = await transcribe_with_google(processing_path, language)
        elif provider == "whisper" and audio_services.whisper_model:
            result = await transcribe_with_local_whisper(processing_path, language)
        else:
            result = await transcribe_with_speech_recognition(processing_path, language)

        # Add speaker detection if enabled
        if enable_speaker_detection and result.get("text"):
            speaker_segments = await detect_speakers(processing_path, result["text"])
            result["speaker_segments"] = speaker_segments

        # Clean up
        os.unlink(tmp_path)
        if enable_noise_reduction and os.path.exists(enhanced_path):
            os.unlink(enhanced_path)

        return TranscriptionResponse(**result)
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using specified provider"""
    try:
        if request.provider == "gtts":
            output_path = await generate_tts_gtts(request.text, request.voice)
        elif request.provider == "edge-tts":
            output_path = await generate_tts_edge(request.text, request.voice, request.speed, request.pitch)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported TTS provider: {request.provider}")

        return FileResponse(
            output_path,
            media_type="audio/mp3",
            filename="speech.mp3",
            background=lambda: os.unlink(output_path)
        )
        
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

# Helper functions
def calculate_noise_level(audio_data):
    """Calculate noise level in audio"""
    # Simple noise estimation using spectral centroid
    spectral_centroids = librosa.feature.spectral_centroid(y=audio_data)[0]
    return float(np.mean(spectral_centroids))

def perform_vad_analysis(audio_path):
    """Perform Voice Activity Detection"""
    try:
        # Load audio with specific parameters for VAD
        audio = AudioSegment.from_file(audio_path)
        audio = audio.set_frame_rate(16000).set_channels(1)
        
        # Convert to raw audio data
        raw_data = audio.raw_data
        
        # Analyze in 30ms chunks
        frame_duration = 30  # ms
        frame_size = int(16000 * frame_duration / 1000) * 2  # 2 bytes per sample
        
        segments = []
        current_segment = None
        
        for i in range(0, len(raw_data), frame_size):
            frame = raw_data[i:i + frame_size]
            if len(frame) < frame_size:
                break
                
            is_speech = audio_services.vad.is_speech(frame, 16000)
            time_offset = i / (16000 * 2)  # Convert to seconds
            
            if is_speech and (not current_segment or current_segment["type"] != "speech"):
                if current_segment:
                    segments.append(current_segment)
                current_segment = {"start": time_offset, "type": "speech"}
            elif not is_speech and (not current_segment or current_segment["type"] != "silence"):
                if current_segment:
                    segments.append(current_segment)
                current_segment = {"start": time_offset, "type": "silence"}
                
            if current_segment:
                current_segment["end"] = time_offset + (frame_duration / 1000)
        
        if current_segment:
            segments.append(current_segment)
            
        return segments
        
    except Exception as e:
        logger.warning(f"VAD analysis failed: {e}")
        return []

def assess_speech_quality(audio_data, noise_level, vad_segments):
    """Assess overall speech quality"""
    speech_ratio = sum(
        seg["end"] - seg["start"] 
        for seg in vad_segments 
        if seg["type"] == "speech"
    ) / len(audio_data) * 22050 if vad_segments else 0.5
    
    if noise_level < 1000 and speech_ratio > 0.6:
        return "excellent"
    elif noise_level < 2000 and speech_ratio > 0.4:
        return "good"
    elif noise_level < 4000 and speech_ratio > 0.2:
        return "fair"
    else:
        return "poor"

async def transcribe_with_openai(audio_path, language):
    """Transcribe using OpenAI Whisper API"""
    try:
        with open(audio_path, "rb") as audio_file:
            response = audio_services.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language if language != "auto" else None,
                response_format="verbose_json"
            )
        
        return {
            "text": response.text,
            "confidence": 0.9,  # OpenAI doesn't provide confidence scores
            "language": response.language or language,
            "duration": response.duration,
            "metadata": {"provider": "openai-whisper", "model": "whisper-1"}
        }
    except Exception as e:
        logger.error(f"OpenAI transcription failed: {e}")
        raise

async def transcribe_with_google(audio_path, language):
    """Transcribe using Google Cloud Speech-to-Text"""
    try:
        with open(audio_path, "rb") as audio_file:
            content = audio_file.read()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=22050,
            language_code=language if language != "auto" else "en-US",
            enable_automatic_punctuation=True,
            enable_word_confidence=True
        )

        response = audio_services.speech_client.recognize(config=config, audio=audio)
        
        if response.results:
            result = response.results[0]
            alternative = result.alternatives[0]
            
            return {
                "text": alternative.transcript,
                "confidence": alternative.confidence,
                "language": language,
                "duration": 0.0,  # Google doesn't provide duration in this format
                "metadata": {"provider": "google-speech", "word_count": len(alternative.transcript.split())}
            }
        else:
            return {
                "text": "",
                "confidence": 0.0,
                "language": language,
                "duration": 0.0,
                "metadata": {"provider": "google-speech", "error": "No speech detected"}
            }
            
    except Exception as e:
        logger.error(f"Google transcription failed: {e}")
        raise

async def transcribe_with_local_whisper(audio_path, language):
    """Transcribe using local Whisper model"""
    try:
        # Load and preprocess audio
        audio_data, sample_rate = librosa.load(audio_path, sr=16000)
        
        # Process with Whisper
        inputs = audio_services.whisper_processor(
            audio_data, 
            sampling_rate=16000, 
            return_tensors="pt"
        )
        
        # Generate transcription
        with torch.no_grad():
            predicted_ids = audio_services.whisper_model.generate(inputs["input_features"])
            transcription = audio_services.whisper_processor.batch_decode(
                predicted_ids, skip_special_tokens=True
            )[0]
        
        return {
            "text": transcription,
            "confidence": 0.85,  # Estimated confidence for local model
            "language": language,
            "duration": len(audio_data) / sample_rate,
            "metadata": {"provider": "local-whisper", "model": "whisper-base"}
        }
        
    except Exception as e:
        logger.error(f"Local Whisper transcription failed: {e}")
        raise

async def transcribe_with_speech_recognition(audio_path, language):
    """Transcribe using speech_recognition library (fallback)"""
    try:
        r = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            audio_data = r.record(source)
        
        text = r.recognize_google(audio_data, language=language if language != "auto" else None)
        
        return {
            "text": text,
            "confidence": 0.8,  # Estimated confidence
            "language": language,
            "duration": 0.0,
            "metadata": {"provider": "speech-recognition", "engine": "google"}
        }
        
    except sr.UnknownValueError:
        return {
            "text": "",
            "confidence": 0.0,
            "language": language,
            "duration": 0.0,
            "metadata": {"provider": "speech-recognition", "error": "Could not understand audio"}
        }
    except Exception as e:
        logger.error(f"Speech recognition failed: {e}")
        raise

async def detect_speakers(audio_path, text):
    """Basic speaker detection (placeholder for more advanced implementation)"""
    # This is a simplified implementation
    # In a real scenario, you would use speaker diarization models
    return [
        {
            "speaker": "Speaker 1",
            "start": 0.0,
            "end": 10.0,
            "text": text[:len(text)//2]
        },
        {
            "speaker": "Speaker 2", 
            "start": 10.0,
            "end": 20.0,
            "text": text[len(text)//2:]
        }
    ] if len(text) > 100 else []

async def generate_tts_gtts(text, voice):
    """Generate TTS using gTTS"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
        tts = gTTS(text=text, lang=voice, slow=False)
        tts.save(tmp_file.name)
        return tmp_file.name

async def generate_tts_edge(text, voice, speed, pitch):
    """Generate TTS using Edge TTS"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(tmp_file.name)
        return tmp_file.name

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
