"""
SDXL Image Generation Service
Generates high-quality NSFW images locally using Stable Diffusion XL
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
from diffusers.models.attention_processor import AttnProcessor2_0
import boto3
from PIL import Image
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

app = FastAPI(title="SDXL Image Generation Service", version="1.0.0")

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "dream-ai-media")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
CLOUDFRONT_URL = os.getenv("CLOUDFRONT_URL", "https://d1234.cloudfront.net")

# Model configuration
MODEL_ID = os.getenv("SDXL_MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0")
REFINER_ID = os.getenv("SDXL_REFINER_ID", "stabilityai/stable-diffusion-xl-refiner-1.0")
LORA_WEIGHTS = os.getenv("SDXL_LORA_PATH", "./models/lora/nsfw_lora.safetensors")

# Redis client for queue
redis_client = redis.from_url(REDIS_URL)

# S3 client
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

# Global pipeline variable (loaded on startup)
pipeline = None
refiner = None


class ImageGenerationRequest(BaseModel):
    """Request schema for image generation"""
    girl_id: str = Field(..., description="ID of the girlfriend")
    user_id: int = Field(..., description="User ID requesting the image")
    prompt: str = Field(..., description="Main prompt for image generation")
    negative_prompt: Optional[str] = Field(None, description="Negative prompt")
    context: Optional[str] = Field(None, description="Context from conversation")
    affection_level: int = Field(default=50, ge=0, le=100)
    nsfw_level: int = Field(default=50, ge=0, le=100)
    num_inference_steps: int = Field(default=30, ge=20, le=50)
    guidance_scale: float = Field(default=7.5, ge=5.0, le=15.0)
    high_quality: bool = Field(default=False, description="Use refiner for higher quality")
    priority: str = Field(default="normal", description="Priority: normal, high, urgent")


class ImageGenerationResponse(BaseModel):
    """Response schema for image generation"""
    job_id: str
    status: str  # queued, processing, completed, failed
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_time: Optional[float] = None
    error: Optional[str] = None


class GirlAppearance(BaseModel):
    """Girl appearance attributes for prompt generation"""
    ethnicity: str
    age: int
    body_type: str
    breast_size: str
    hair_color: str
    hair_length: str
    eye_color: str


# NSFW-optimized prompts by affection level
NSFW_PROMPTS_BY_AFFECTION = {
    "low": {  # 0-30: Suggestive but covered
        "clothing": ["casual dress", "jeans and tank top", "summer dress", "workout clothes"],
        "pose": ["sitting casually", "standing pose", "relaxed posture", "friendly smile"],
        "setting": ["coffee shop", "park", "bedroom (SFW)", "living room"],
        "style": "photorealistic, natural lighting, casual"
    },
    "medium": {  # 30-60: More revealing
        "clothing": ["lingerie", "bikini", "short dress", "revealing top", "tight clothes"],
        "pose": ["seductive pose", "leaning forward", "lying on bed", "playful expression"],
        "setting": ["bedroom", "bathroom", "hotel room", "beach"],
        "style": "photorealistic, soft lighting, intimate atmosphere"
    },
    "high": {  # 60-85: Explicit but tasteful
        "clothing": ["see-through lingerie", "topless", "minimal clothing", "nude with covering"],
        "pose": ["erotic pose", "provocative", "sensual expression", "alluring"],
        "setting": ["bedroom intimate", "shower", "luxury suite", "intimate setting"],
        "style": "photorealistic, cinematic lighting, sensual, detailed skin texture"
    },
    "extreme": {  # 85-100: Fully explicit
        "clothing": ["nude", "completely naked", "no clothes"],
        "pose": ["explicit pose", "very provocative", "pornographic pose", "NSFW"],
        "setting": ["bedroom explicit", "any intimate location"],
        "style": "photorealistic, professional lighting, ultra detailed, 8k resolution"
    }
}


def get_affection_category(affection_level: int) -> str:
    """Map affection level to category"""
    if affection_level < 30:
        return "low"
    elif affection_level < 60:
        return "medium"
    elif affection_level < 85:
        return "high"
    else:
        return "extreme"


def generate_contextual_prompt(
    girl: GirlAppearance,
    affection_level: int,
    nsfw_level: int,
    context: Optional[str] = None,
    user_request: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate optimized prompt based on girl attributes, affection, and context
    """
    category = get_affection_category(affection_level)
    nsfw_data = NSFW_PROMPTS_BY_AFFECTION[category]

    # Base quality tags
    quality_tags = [
        "masterpiece", "best quality", "ultra detailed", "8k uhd",
        "photorealistic", "professional photography", "detailed skin texture",
        "natural skin", "realistic lighting", "high resolution"
    ]

    # Appearance description
    appearance = f"{girl.ethnicity} woman, {girl.age} years old, {girl.body_type} body"

    # Physical features
    features = [
        f"{girl.breast_size} breasts" if nsfw_level > 40 else "",
        f"{girl.hair_length} {girl.hair_color} hair",
        f"{girl.eye_color} eyes",
        "beautiful face", "detailed facial features", "natural makeup"
    ]
    features = [f for f in features if f]  # Remove empty strings

    # Determine clothing based on user request or affection
    import random
    clothing = user_request if user_request else random.choice(nsfw_data["clothing"])
    pose = random.choice(nsfw_data["pose"])
    setting = random.choice(nsfw_data["setting"])

    # Construct full prompt
    prompt_parts = (
        quality_tags +
        [appearance] +
        features +
        [clothing, pose, setting, nsfw_data["style"]]
    )

    prompt = ", ".join(prompt_parts)

    # Negative prompt (what to avoid)
    negative_prompt = """
    cartoon, anime, 3d render, cgi, drawing, painting, illustration,
    ugly, deformed, bad anatomy, bad hands, bad face, bad proportions,
    extra limbs, missing limbs, disfigured, poorly drawn, low quality,
    blurry, grainy, pixelated, jpeg artifacts, compression artifacts,
    watermark, signature, text, logo, username, artist name,
    unrealistic, fake, plastic, doll-like, uncanny valley,
    oversaturated, overexposed, underexposed, out of focus
    """

    return {
        "prompt": prompt,
        "negative_prompt": negative_prompt.strip(),
        "category": category,
        "nsfw_level": nsfw_level
    }


def load_models():
    """Load SDXL models into memory (called on startup)"""
    global pipeline, refiner

    try:
        logger.info("Loading SDXL base model...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32

        # Load base model
        pipeline = StableDiffusionXLPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            use_safetensors=True,
            variant="fp16" if device == "cuda" else None
        )

        # Optimize for speed and memory
        pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            pipeline.scheduler.config
        )

        if device == "cuda":
            # Enable memory optimizations
            pipeline.enable_attention_slicing()
            pipeline.enable_vae_slicing()

            # Use faster attention (Torch 2.0+)
            try:
                pipeline.unet.set_attn_processor(AttnProcessor2_0())
            except:
                logger.warning("Could not enable AttnProcessor2_0")

            # Load LoRA weights if available
            if os.path.exists(LORA_WEIGHTS):
                logger.info(f"Loading LoRA weights from {LORA_WEIGHTS}")
                pipeline.load_lora_weights(LORA_WEIGHTS)

        pipeline = pipeline.to(device)

        # Load refiner (optional, for high quality)
        if os.path.exists(REFINER_ID) or "stabilityai" in REFINER_ID:
            logger.info("Loading SDXL refiner model...")
            refiner = StableDiffusionXLPipeline.from_pretrained(
                REFINER_ID,
                torch_dtype=dtype,
                use_safetensors=True,
                variant="fp16" if device == "cuda" else None
            )
            refiner = refiner.to(device)

        logger.info(f"Models loaded successfully on {device}")

    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        raise


@app.on_event("startup")
async def startup_event():
    """Load models when service starts"""
    load_models()


def generate_image_internal(
    prompt: str,
    negative_prompt: str,
    num_inference_steps: int,
    guidance_scale: float,
    high_quality: bool
) -> Image.Image:
    """
    Internal function to generate image using SDXL
    """
    if pipeline is None:
        raise RuntimeError("Pipeline not loaded")

    try:
        # Generate base image
        logger.info(f"Generating image with {num_inference_steps} steps...")

        # Base generation
        image = pipeline(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            height=1024,
            width=1024,
            output_type="pil" if not high_quality else "latent"
        ).images[0]

        # Refine if high quality requested and refiner available
        if high_quality and refiner is not None:
            logger.info("Refining image with SDXL refiner...")
            image = refiner(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=image,
                num_inference_steps=20,
                guidance_scale=guidance_scale
            ).images[0]

        return image

    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise


def upload_to_s3(image: Image.Image, girl_id: str, job_id: str) -> Dict[str, str]:
    """
    Upload generated image to S3 and return URLs
    """
    try:
        # Save full size image
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG', quality=95, optimize=True)
        img_buffer.seek(0)

        # S3 key
        key = f"generated/{girl_id}/{job_id}.jpg"

        # Upload full size
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=key,
            Body=img_buffer,
            ContentType='image/jpeg',
            CacheControl='max-age=31536000'  # 1 year
        )

        # Generate thumbnail (300x300)
        thumbnail = image.copy()
        thumbnail.thumbnail((300, 300), Image.Resampling.LANCZOS)
        thumb_buffer = io.BytesIO()
        thumbnail.save(thumb_buffer, format='JPEG', quality=85, optimize=True)
        thumb_buffer.seek(0)

        thumb_key = f"generated/{girl_id}/{job_id}_thumb.jpg"
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=thumb_key,
            Body=thumb_buffer,
            ContentType='image/jpeg',
            CacheControl='max-age=31536000'
        )

        # Return CDN URLs
        return {
            "image_url": f"{CLOUDFRONT_URL}/{key}",
            "thumbnail_url": f"{CLOUDFRONT_URL}/{thumb_key}"
        }

    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise


def process_generation_job(job_id: str):
    """
    Background task to process image generation
    """
    try:
        # Get job data from Redis
        job_data = redis_client.get(f"generation_job:{job_id}")
        if not job_data:
            logger.error(f"Job {job_id} not found in Redis")
            return

        job = json.loads(job_data)

        # Update status to processing
        job['status'] = 'processing'
        job['started_at'] = datetime.utcnow().isoformat()
        redis_client.setex(
            f"generation_job:{job_id}",
            3600,  # 1 hour TTL
            json.dumps(job)
        )

        start_time = datetime.utcnow()

        # Generate image
        image = generate_image_internal(
            prompt=job['prompt'],
            negative_prompt=job['negative_prompt'],
            num_inference_steps=job['num_inference_steps'],
            guidance_scale=job['guidance_scale'],
            high_quality=job['high_quality']
        )

        # Upload to S3
        urls = upload_to_s3(image, job['girl_id'], job_id)

        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Update job with results
        job['status'] = 'completed'
        job['image_url'] = urls['image_url']
        job['thumbnail_url'] = urls['thumbnail_url']
        job['generation_time'] = generation_time
        job['completed_at'] = datetime.utcnow().isoformat()

        redis_client.setex(
            f"generation_job:{job_id}",
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
            f"generation_job:{job_id}",
            3600,
            json.dumps(job)
        )


@app.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    background_tasks: BackgroundTasks
):
    """
    Queue an image generation job
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
            "num_inference_steps": request.num_inference_steps,
            "guidance_scale": request.guidance_scale,
            "high_quality": request.high_quality,
            "priority": request.priority,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat()
        }

        redis_client.setex(
            f"generation_job:{job_id}",
            3600,  # 1 hour TTL
            json.dumps(job_data)
        )

        # Add to processing queue
        background_tasks.add_task(process_generation_job, job_id)

        logger.info(f"Queued generation job {job_id} for user {request.user_id}")

        return ImageGenerationResponse(
            job_id=job_id,
            status="queued"
        )

    except Exception as e:
        logger.error(f"Failed to queue job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{job_id}", response_model=ImageGenerationResponse)
async def get_job_status(job_id: str):
    """
    Get the status of a generation job
    """
    try:
        job_data = redis_client.get(f"generation_job:{job_id}")

        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")

        job = json.loads(job_data)

        return ImageGenerationResponse(
            job_id=job_id,
            status=job['status'],
            image_url=job.get('image_url'),
            thumbnail_url=job.get('thumbnail_url'),
            generation_time=job.get('generation_time'),
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
        "refiner_loaded": refiner is not None,
        "gpu_available": gpu_available,
        "gpu_count": gpu_count,
        "device": "cuda" if gpu_available else "cpu"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
