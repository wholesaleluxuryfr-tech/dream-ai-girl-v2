"""
AnimateDiff Video Generation Service
Generates short animated videos from static images or text prompts
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import torch
from diffusers import AnimateDiffPipeline, MotionAdapter, DDIMScheduler
from diffusers.utils import export_to_video
import boto3
from PIL import Image
import io
import uuid
import redis
import json
import os
from datetime import datetime
import logging
import subprocess

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AnimateDiff Video Generation Service", version="1.0.0")

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "dream-ai-media")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
CLOUDFRONT_URL = os.getenv("CLOUDFRONT_URL", "https://d1234.cloudfront.net")

# Model configuration
BASE_MODEL_ID = os.getenv("ANIMATEDIFF_BASE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
MOTION_ADAPTER_ID = os.getenv("MOTION_ADAPTER_ID", "guoyww/animatediff-motion-adapter-sdxl-beta")

# Redis client
redis_client = redis.from_url(REDIS_URL)

# S3 client
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

# Global pipeline variable
pipeline = None


class VideoGenerationRequest(BaseModel):
    """Request schema for video generation"""
    girl_id: str = Field(..., description="ID of the girlfriend")
    user_id: int = Field(..., description="User ID requesting the video")
    prompt: str = Field(..., description="Main prompt for video generation")
    negative_prompt: Optional[str] = Field(None, description="Negative prompt")
    base_image_url: Optional[str] = Field(None, description="Base image to animate")
    num_frames: int = Field(default=16, ge=8, le=32, description="Number of frames (8-32)")
    num_inference_steps: int = Field(default=25, ge=15, le=50)
    guidance_scale: float = Field(default=7.5, ge=5.0, le=15.0)
    fps: int = Field(default=8, ge=4, le=16, description="Frames per second")
    duration_seconds: int = Field(default=2, ge=1, le=5)
    priority: str = Field(default="normal", description="Priority: normal, high, urgent")


class VideoGenerationResponse(BaseModel):
    """Response schema for video generation"""
    job_id: str
    status: str  # queued, processing, completed, failed
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_time: Optional[float] = None
    error: Optional[str] = None
    duration: Optional[float] = None
    frame_count: Optional[int] = None


def load_models():
    """Load AnimateDiff models into memory"""
    global pipeline

    try:
        logger.info("Loading AnimateDiff pipeline...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32

        # Load motion adapter
        logger.info("Loading motion adapter...")
        adapter = MotionAdapter.from_pretrained(
            MOTION_ADAPTER_ID,
            torch_dtype=dtype
        )

        # Load AnimateDiff pipeline
        logger.info("Loading base model...")
        pipeline = AnimateDiffPipeline.from_pretrained(
            BASE_MODEL_ID,
            motion_adapter=adapter,
            torch_dtype=dtype,
            use_safetensors=True
        )

        # Optimize scheduler for better quality
        pipeline.scheduler = DDIMScheduler.from_config(
            pipeline.scheduler.config,
            beta_schedule="linear",
            steps_offset=1
        )

        if device == "cuda":
            # Enable memory optimizations
            pipeline.enable_vae_slicing()
            pipeline.enable_vae_tiling()

            # Enable attention slicing for memory efficiency
            pipeline.enable_attention_slicing(1)

        pipeline = pipeline.to(device)

        logger.info(f"AnimateDiff pipeline loaded successfully on {device}")

    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        raise


@app.on_event("startup")
async def startup_event():
    """Load models when service starts"""
    load_models()


def generate_video_internal(
    prompt: str,
    negative_prompt: str,
    num_frames: int,
    num_inference_steps: int,
    guidance_scale: float,
    fps: int
) -> str:
    """
    Internal function to generate video using AnimateDiff
    Returns path to generated video file
    """
    if pipeline is None:
        raise RuntimeError("Pipeline not loaded")

    try:
        logger.info(f"Generating {num_frames} frames with {num_inference_steps} steps...")

        # Generate frames
        output = pipeline(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            height=512,  # AnimateDiff works best with 512x512
            width=512,
            generator=torch.Generator("cuda" if torch.cuda.is_available() else "cpu").manual_seed(42)
        )

        frames = output.frames[0]  # Get first (and only) video

        # Save as temporary video file
        temp_video_path = f"/tmp/video_{uuid.uuid4()}.mp4"
        export_to_video(frames, temp_video_path, fps=fps)

        return temp_video_path

    except Exception as e:
        logger.error(f"Video generation failed: {e}")
        raise


def create_thumbnail(video_path: str) -> Image.Image:
    """Extract first frame as thumbnail"""
    try:
        import cv2

        cap = cv2.VideoCapture(video_path)
        ret, frame = cap.read()
        cap.release()

        if ret:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            return Image.fromarray(frame_rgb)
        else:
            # Return blank image if extraction fails
            return Image.new('RGB', (512, 512), color='black')

    except Exception as e:
        logger.error(f"Failed to create thumbnail: {e}")
        return Image.new('RGB', (512, 512), color='black')


def upload_to_s3(video_path: str, girl_id: str, job_id: str) -> Dict[str, str]:
    """
    Upload generated video to S3 and return URLs
    """
    try:
        # Upload video
        with open(video_path, 'rb') as video_file:
            video_key = f"generated/videos/{girl_id}/{job_id}.mp4"

            s3_client.put_object(
                Bucket=AWS_S3_BUCKET,
                Key=video_key,
                Body=video_file,
                ContentType='video/mp4',
                CacheControl='max-age=31536000'  # 1 year
            )

        # Create and upload thumbnail
        thumbnail = create_thumbnail(video_path)
        thumb_buffer = io.BytesIO()
        thumbnail.save(thumb_buffer, format='JPEG', quality=85, optimize=True)
        thumb_buffer.seek(0)

        thumb_key = f"generated/videos/{girl_id}/{job_id}_thumb.jpg"
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=thumb_key,
            Body=thumb_buffer,
            ContentType='image/jpeg',
            CacheControl='max-age=31536000'
        )

        # Get video duration
        import cv2
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        cap.release()

        # Clean up temp file
        os.remove(video_path)

        # Return CDN URLs
        return {
            "video_url": f"{CLOUDFRONT_URL}/{video_key}",
            "thumbnail_url": f"{CLOUDFRONT_URL}/{thumb_key}",
            "duration": duration,
            "frame_count": frame_count
        }

    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise


def process_generation_job(job_id: str):
    """
    Background task to process video generation
    """
    try:
        # Get job data from Redis
        job_data = redis_client.get(f"video_job:{job_id}")
        if not job_data:
            logger.error(f"Job {job_id} not found in Redis")
            return

        job = json.loads(job_data)

        # Update status to processing
        job['status'] = 'processing'
        job['started_at'] = datetime.utcnow().isoformat()
        redis_client.setex(
            f"video_job:{job_id}",
            7200,  # 2 hour TTL
            json.dumps(job)
        )

        start_time = datetime.utcnow()

        # Generate video
        video_path = generate_video_internal(
            prompt=job['prompt'],
            negative_prompt=job['negative_prompt'],
            num_frames=job['num_frames'],
            num_inference_steps=job['num_inference_steps'],
            guidance_scale=job['guidance_scale'],
            fps=job['fps']
        )

        # Upload to S3
        upload_result = upload_to_s3(video_path, job['girl_id'], job_id)

        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Update job with results
        job['status'] = 'completed'
        job['video_url'] = upload_result['video_url']
        job['thumbnail_url'] = upload_result['thumbnail_url']
        job['duration'] = upload_result['duration']
        job['frame_count'] = upload_result['frame_count']
        job['generation_time'] = generation_time
        job['completed_at'] = datetime.utcnow().isoformat()

        redis_client.setex(
            f"video_job:{job_id}",
            7200,
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
            f"video_job:{job_id}",
            7200,
            json.dumps(job)
        )


@app.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks
):
    """
    Queue a video generation job
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())

        # Store job in Redis
        job_data = {
            "job_id": job_id,
            "girl_id": request.girl_id,
            "user_id": request.user_id,
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt or "",
            "num_frames": request.num_frames,
            "num_inference_steps": request.num_inference_steps,
            "guidance_scale": request.guidance_scale,
            "fps": request.fps,
            "priority": request.priority,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat()
        }

        redis_client.setex(
            f"video_job:{job_id}",
            7200,  # 2 hour TTL
            json.dumps(job_data)
        )

        # Add to processing queue
        background_tasks.add_task(process_generation_job, job_id)

        logger.info(f"Queued video generation job {job_id} for user {request.user_id}")

        return VideoGenerationResponse(
            job_id=job_id,
            status="queued"
        )

    except Exception as e:
        logger.error(f"Failed to queue job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{job_id}", response_model=VideoGenerationResponse)
async def get_job_status(job_id: str):
    """
    Get the status of a video generation job
    """
    try:
        job_data = redis_client.get(f"video_job:{job_id}")

        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")

        job = json.loads(job_data)

        return VideoGenerationResponse(
            job_id=job_id,
            status=job['status'],
            video_url=job.get('video_url'),
            thumbnail_url=job.get('thumbnail_url'),
            generation_time=job.get('generation_time'),
            duration=job.get('duration'),
            frame_count=job.get('frame_count'),
            error=job.get('error')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    gpu_available = torch.cuda.is_available()
    gpu_count = torch.cuda.device_count() if gpu_available else 0

    return {
        "status": "healthy",
        "pipeline_loaded": pipeline is not None,
        "gpu_available": gpu_available,
        "gpu_count": gpu_count,
        "device": "cuda" if gpu_available else "cpu"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
