#!/usr/bin/env python3
"""
Auralis Transcriptor - Minimal Python Audio Services
Core audio processing, transcription, and TTS services
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
from pydub import AudioSegment
from gtts import gTTS
import io
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Auralis Transcriptor Audio Services",
    description="Audio processing, transcription, and TTS services",
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
class TranscriptionResponse(BaseModel):
    text: str
    confidence: float
    language: str
    duration: float
    metadata: Dict[str, Any]

class TTSRequest(BaseModel):
    text: str
    voice: str = "en"
    provider: str = "gtts"

class AudioAnalysisResponse(BaseModel):
    duration: float
    format: str
    channels: int
    frame_rate: int
    sample_width: int

# Global services
class SimpleAudioServices:
    def __init__(self):
        self.openai_client = None
        self.recognizer = sr.Recognizer()
        
    def initialize(self):
        """Initialize services"""
        try:
            # Initialize OpenAI client if API key is available
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                self.openai_client = openai.OpenAI(api_key=openai_key)
                logger.info("OpenAI client initialized")
            else:
                logger.warning("OpenAI API key not found")
                
        except Exception as e:
            logger.error(f"Error initializing services: {e}")

# Global services instance
audio_services = SimpleAudioServices()

@app.on_event("startup")
async def startup_event():
    audio_services.initialize()

@app.get("/")
async def root():
    return {"message": "Auralis Transcriptor Audio Services", "status": "online"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "openai_whisper": bool(audio_services.openai_client),
            "speech_recognition": True,
            "gtts": True,
            "audio_processing": True
        }
    }

@app.post("/audio/analyze", response_model=AudioAnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    """Analyze audio file and return basic audio metrics"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Load audio using pydub
        audio = AudioSegment.from_file(tmp_path)
        
        # Get audio properties
        duration = len(audio) / 1000.0  # Convert to seconds
        
        # Clean up
        os.unlink(tmp_path)
        
        return AudioAnalysisResponse(
            duration=duration,
            format="wav",
            channels=audio.channels,
            frame_rate=audio.frame_rate,
            sample_width=audio.sample_width
        )
        
    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

@app.post("/audio/enhance")
async def enhance_audio(file: UploadFile = File(...)):
    """Basic audio enhancement using pydub"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Load and enhance audio
        audio = AudioSegment.from_file(tmp_path)
        
        # Basic enhancement: normalize and apply simple filter
        enhanced_audio = audio.normalize()
        
        # Convert to standard format
        enhanced_audio = enhanced_audio.set_frame_rate(22050).set_channels(1)
        
        # Save enhanced audio
        output_path = tmp_path + "_enhanced.wav"
        enhanced_audio.export(output_path, format="wav")
        
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
    provider: str = Form("openai-whisper"),
    language: str = Form("en")
):
    """Transcribe audio using specified provider"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Convert to WAV format for compatibility
        audio = AudioSegment.from_file(tmp_path)
        wav_path = tmp_path + ".wav"
        audio.export(wav_path, format="wav")

        # Transcribe based on provider
        if provider == "openai-whisper" and audio_services.openai_client:
            result = await transcribe_with_openai(wav_path, language)
        else:
            result = await transcribe_with_speech_recognition(wav_path, language)

        # Clean up
        os.unlink(tmp_path)
        os.unlink(wav_path)

        return TranscriptionResponse(**result)
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using gTTS"""
    try:
        output_path = await generate_tts_gtts(request.text, request.voice)
        
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

async def transcribe_with_speech_recognition(audio_path, language):
    """Transcribe using speech_recognition library (fallback)"""
    try:
        with sr.AudioFile(audio_path) as source:
            audio_data = audio_services.recognizer.record(source)
        
        # Try Google Speech Recognition
        try:
            text = audio_services.recognizer.recognize_google(
                audio_data, 
                language=language if language != "auto" else None
            )
            
            return {
                "text": text,
                "confidence": 0.8,  # Estimated confidence
                "language": language,
                "duration": 0.0,
                "metadata": {"provider": "google-speech-recognition"}
            }
        except sr.UnknownValueError:
            return {
                "text": "",
                "confidence": 0.0,
                "language": language,
                "duration": 0.0,
                "metadata": {"provider": "speech-recognition", "error": "Could not understand audio"}
            }
        except sr.RequestError as e:
            # Fallback to offline recognition if available
            try:
                text = audio_services.recognizer.recognize_sphinx(audio_data)
                return {
                    "text": text,
                    "confidence": 0.6,
                    "language": language,
                    "duration": 0.0,
                    "metadata": {"provider": "sphinx-offline"}
                }
            except:
                raise HTTPException(status_code=500, detail=f"Speech recognition failed: {e}")
                
    except Exception as e:
        logger.error(f"Speech recognition failed: {e}")
        raise

async def generate_tts_gtts(text, voice):
    """Generate TTS using gTTS"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
        tts = gTTS(text=text, lang=voice, slow=False)
        tts.save(tmp_file.name)
        return tmp_file.name

if __name__ == "__main__":
    uvicorn.run(
        "simple_audio_service:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
