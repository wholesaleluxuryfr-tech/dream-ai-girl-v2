"""
Voice TTS Service using ElevenLabs API
Converts text messages to realistic voice audio
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import httpx
import boto3
import io
import uuid
import redis
import json
import os
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voice TTS Service", version="1.0.0")

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "dream-ai-media")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
CLOUDFRONT_URL = os.getenv("CLOUDFRONT_URL", "https://d1234.cloudfront.net")

# ElevenLabs API configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

# Redis client
redis_client = redis.from_url(REDIS_URL)

# S3 client
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)


# Voice mapping by girl archetype
VOICE_PROFILES = {
    "cute": "EXAVITQu4vr4xnSDxMaL",  # Bella - Young, sweet voice
    "shy": "21m00Tcm4TlvDq8ikWAM",  # Rachel - Soft, gentle voice
    "confident": "pNInz6obpgDQGcFmaJgB",  # Charlotte - Clear, confident
    "dominant": "MF3mGyEYCl7XYWbV9V6O",  # Elli - Strong, commanding
    "seductive": "EXAVITQu4vr4xnSDxMaL",  # Bella - Sultry, seductive
    "playful": "pNInz6obpgDQGcFmaJgB",  # Charlotte - Playful, fun
    "romantic": "21m00Tcm4TlvDq8ikWAM",  # Rachel - Warm, romantic
    "adventurous": "MF3mGyEYCl7XYWbV9V6O",  # Elli - Energetic
    "default": "21m00Tcm4TlvDq8ikWAM"  # Rachel as default
}


class VoiceGenerationRequest(BaseModel):
    """Request schema for voice generation"""
    girl_id: str = Field(..., description="ID of the girlfriend")
    user_id: int = Field(..., description="User ID requesting the voice")
    text: str = Field(..., description="Text to convert to speech", max_length=5000)
    archetype: str = Field(default="default", description="Voice archetype")
    emotion: Optional[str] = Field(None, description="Emotion: happy, sad, excited, seductive")
    stability: float = Field(default=0.5, ge=0.0, le=1.0, description="Voice stability (0-1)")
    similarity_boost: float = Field(default=0.75, ge=0.0, le=1.0, description="Clarity (0-1)")
    priority: str = Field(default="normal", description="Priority: normal, high, urgent")


class VoiceGenerationResponse(BaseModel):
    """Response schema for voice generation"""
    job_id: str
    status: str  # queued, processing, completed, failed
    audio_url: Optional[str] = None
    generation_time: Optional[float] = None
    duration: Optional[float] = None  # Audio duration in seconds
    characters_used: Optional[int] = None
    error: Optional[str] = None


class VoiceInfo(BaseModel):
    """Voice information"""
    voice_id: str
    name: str
    description: str


def get_voice_id(archetype: str) -> str:
    """Get ElevenLabs voice ID for archetype"""
    return VOICE_PROFILES.get(archetype, VOICE_PROFILES["default"])


async def generate_speech(
    text: str,
    voice_id: str,
    stability: float,
    similarity_boost: float
) -> bytes:
    """
    Call ElevenLabs API to generate speech
    """
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not configured")

    url = f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",  # Supports French
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data, headers=headers)

            if response.status_code != 200:
                error_text = response.text
                logger.error(f"ElevenLabs API error: {error_text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ElevenLabs API error: {error_text}"
                )

            return response.content

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="ElevenLabs API timeout")
    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def upload_audio_to_s3(audio_data: bytes, girl_id: str, job_id: str) -> Dict[str, str]:
    """
    Upload generated audio to S3 and return URL
    """
    try:
        # S3 key
        key = f"voices/{girl_id}/{job_id}.mp3"

        # Upload audio
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=key,
            Body=audio_data,
            ContentType='audio/mpeg',
            CacheControl='max-age=31536000'  # 1 year
        )

        # Get audio duration (estimate based on size)
        # ElevenLabs generates ~1KB per 0.1s at 128kbps
        duration = len(audio_data) / 16000  # Rough estimate

        # Return CDN URL
        return {
            "audio_url": f"{CLOUDFRONT_URL}/{key}",
            "duration": duration
        }

    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise


def process_generation_job(job_id: str):
    """
    Background task to process voice generation
    """
    import asyncio

    try:
        # Get job data from Redis
        job_data = redis_client.get(f"voice_job:{job_id}")
        if not job_data:
            logger.error(f"Job {job_id} not found in Redis")
            return

        job = json.loads(job_data)

        # Update status to processing
        job['status'] = 'processing'
        job['started_at'] = datetime.utcnow().isoformat()
        redis_client.setex(
            f"voice_job:{job_id}",
            3600,  # 1 hour TTL
            json.dumps(job)
        )

        start_time = datetime.utcnow()

        # Generate speech (async)
        audio_data = asyncio.run(generate_speech(
            text=job['text'],
            voice_id=job['voice_id'],
            stability=job['stability'],
            similarity_boost=job['similarity_boost']
        ))

        # Upload to S3
        upload_result = upload_audio_to_s3(audio_data, job['girl_id'], job_id)

        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Update job with results
        job['status'] = 'completed'
        job['audio_url'] = upload_result['audio_url']
        job['duration'] = upload_result['duration']
        job['characters_used'] = len(job['text'])
        job['generation_time'] = generation_time
        job['completed_at'] = datetime.utcnow().isoformat()

        redis_client.setex(
            f"voice_job:{job_id}",
            3600,
            json.dumps(job)
        )

        logger.info(f"Job {job_id} completed in {generation_time:.2f}s")

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")

        # Update job with error
        job['status'] = 'failed'
        job['error'] = str(e)
        job['completed_at'] = datetime.utcnow().isoformat()

        redis_client.setex(
            f"voice_job:{job_id}",
            3600,
            json.dumps(job)
        )


@app.post("/generate", response_model=VoiceGenerationResponse)
async def generate_voice(
    request: VoiceGenerationRequest,
    background_tasks: BackgroundTasks
):
    """
    Queue a voice generation job
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())

        # Get voice ID for archetype
        voice_id = get_voice_id(request.archetype)

        # Store job in Redis
        job_data = {
            "job_id": job_id,
            "girl_id": request.girl_id,
            "user_id": request.user_id,
            "text": request.text,
            "voice_id": voice_id,
            "archetype": request.archetype,
            "stability": request.stability,
            "similarity_boost": request.similarity_boost,
            "priority": request.priority,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat()
        }

        redis_client.setex(
            f"voice_job:{job_id}",
            3600,  # 1 hour TTL
            json.dumps(job_data)
        )

        # Add to processing queue
        background_tasks.add_task(process_generation_job, job_id)

        logger.info(f"Queued voice generation job {job_id} for user {request.user_id}")

        return VoiceGenerationResponse(
            job_id=job_id,
            status="queued"
        )

    except Exception as e:
        logger.error(f"Failed to queue job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{job_id}", response_model=VoiceGenerationResponse)
async def get_job_status(job_id: str):
    """
    Get the status of a voice generation job
    """
    try:
        job_data = redis_client.get(f"voice_job:{job_id}")

        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")

        job = json.loads(job_data)

        return VoiceGenerationResponse(
            job_id=job_id,
            status=job['status'],
            audio_url=job.get('audio_url'),
            generation_time=job.get('generation_time'),
            duration=job.get('duration'),
            characters_used=job.get('characters_used'),
            error=job.get('error')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/voices", response_model=List[VoiceInfo])
async def list_voices():
    """
    List available voice profiles
    """
    return [
        VoiceInfo(
            voice_id=VOICE_PROFILES["cute"],
            name="Cute",
            description="Young, sweet, and playful voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["shy"],
            name="Shy",
            description="Soft, gentle, and reserved voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["confident"],
            name="Confident",
            description="Clear, strong, and self-assured voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["dominant"],
            name="Dominant",
            description="Commanding, powerful, and authoritative voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["seductive"],
            name="Seductive",
            description="Sultry, alluring, and sensual voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["playful"],
            name="Playful",
            description="Fun, energetic, and lighthearted voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["romantic"],
            name="Romantic",
            description="Warm, loving, and intimate voice"
        ),
        VoiceInfo(
            voice_id=VOICE_PROFILES["adventurous"],
            name="Adventurous",
            description="Bold, enthusiastic, and daring voice"
        )
    ]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Test ElevenLabs API availability
    api_available = ELEVENLABS_API_KEY is not None

    return {
        "status": "healthy" if api_available else "degraded",
        "elevenlabs_configured": api_available,
        "voice_profiles": len(VOICE_PROFILES)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
