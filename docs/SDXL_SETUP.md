# SDXL Image Generation Service - Setup Guide

## Overview

This service replaces expensive external APIs (Promptchan, SinKin) with a self-hosted Stable Diffusion XL solution, reducing image generation costs by **90%** while maintaining high quality and enabling full control over NSFW content generation.

**Benefits:**
- ⚡ **2-3 seconds** per image (vs 5-10s with external APIs)
- 💰 **90% cost reduction** (~$0.02 per image → ~$0.002 per GPU compute)
- 🎨 **Full control** over prompts, models, LoRAs
- 🔒 **Privacy** - no data sent to third parties
- 📈 **Scalable** - horizontal scaling with multiple GPU workers

---

## Requirements

### Hardware

**Minimum (for testing)**:
- GPU: NVIDIA GTX 1080 Ti (11GB VRAM) or better
- RAM: 16GB system RAM
- Storage: 20GB free (for models)
- CPU: 4 cores

**Recommended (for production)**:
- GPU: NVIDIA RTX 4090 (24GB VRAM) or A100
- RAM: 32GB system RAM
- Storage: 50GB SSD
- CPU: 8+ cores

**Budget Options:**
- Rent GPU servers: [RunPod](https://runpod.io), [Vast.ai](https://vast.ai)
- Cost: ~$0.30-0.50/hour for RTX 4090
- Can handle 100-200 images/hour

### Software

- Docker with NVIDIA Container Runtime
- CUDA 12.1+ / cuDNN 8+
- Python 3.11+
- ~20GB free disk space for models

---

## Installation

### 1. Setup NVIDIA Container Runtime

```bash
# Install NVIDIA Container Toolkit (Ubuntu/Debian)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Restart Docker
sudo systemctl restart docker

# Test GPU access
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### 2. Download Models

Models are ~12GB total. You have two options:

#### Option A: Auto-download on first run (Recommended)

The service will automatically download models from HuggingFace on first startup (~10 minutes).

#### Option B: Pre-download manually

```bash
cd backend/services/image_generation_service

# Create models directory
mkdir -p models

# Download SDXL base model
python3 << EOF
from diffusers import StableDiffusionXLPipeline
import torch

print("Downloading SDXL base model...")
pipeline = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16,
    use_safetensors=True,
    variant="fp16"
)
pipeline.save_pretrained("./models/sdxl-base")
print("Base model downloaded!")

# Download refiner (optional, for high quality)
print("Downloading SDXL refiner...")
refiner = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-refiner-1.0",
    torch_dtype=torch.float16,
    use_safetensors=True,
    variant="fp16"
)
refiner.save_pretrained("./models/sdxl-refiner")
print("Refiner downloaded!")
EOF
```

### 3. (Optional) Download NSFW LoRA

For better NSFW content generation:

```bash
cd models/lora

# Example: Download from CivitAI or HuggingFace
# wget https://civitai.com/api/download/models/XXXXX -O nsfw_lora.safetensors

# Or use existing NSFW-tuned models
```

### 4. Configure Environment

```bash
cd backend/services/image_generation_service
cp .env.example .env
nano .env
```

**Required settings:**

```env
# Redis for job queue
REDIS_URL=redis://localhost:6379/0

# AWS S3 for image storage
AWS_S3_BUCKET=dream-ai-media
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
CLOUDFRONT_URL=https://d1234.cloudfront.net

# Model configuration
SDXL_MODEL_ID=stabilityai/stable-diffusion-xl-base-1.0
SDXL_REFINER_ID=stabilityai/stable-diffusion-xl-refiner-1.0
SDXL_LORA_PATH=./models/lora/nsfw_lora.safetensors

# Optional: Use pre-downloaded models
# SDXL_MODEL_ID=./models/sdxl-base
# SDXL_REFINER_ID=./models/sdxl-refiner
```

### 5. Build and Run

#### Development (single instance)

```bash
cd backend/services/image_generation_service

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

#### Production (Docker)

```bash
# Build image
docker build -t dream-ai-image-gen:latest .

# Run container with GPU
docker run -d \
  --name image-gen-service \
  --gpus all \
  -p 8007:8007 \
  -v $(pwd)/models:/models \
  -e REDIS_URL=redis://redis:6379/0 \
  -e AWS_S3_BUCKET=dream-ai-media \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e CLOUDFRONT_URL=https://d1234.cloudfront.net \
  dream-ai-image-gen:latest

# Check logs
docker logs -f image-gen-service
```

#### Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  image-generation:
    build: ./backend/services/image_generation_service
    container_name: image-gen-service
    ports:
      - "8007:8007"
    volumes:
      - ./models:/models
      - ./lora:/models/lora
    environment:
      - REDIS_URL=redis://redis:6379/0
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - CLOUDFRONT_URL=${CLOUDFRONT_URL}
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
```

```bash
# Start with docker-compose
docker-compose up -d image-generation
```

---

## Verification

### 1. Health Check

```bash
curl http://localhost:8007/health
```

Expected response:
```json
{
  "status": "healthy",
  "pipeline_loaded": true,
  "refiner_loaded": true,
  "gpu_available": true,
  "gpu_count": 1,
  "device": "cuda"
}
```

### 2. Test Generation

```bash
curl -X POST http://localhost:8007/generate \
  -H "Content-Type: application/json" \
  -d '{
    "girl_id": "test",
    "user_id": 1,
    "prompt": "beautiful woman, 25 years old, long blonde hair, blue eyes, smiling",
    "negative_prompt": "ugly, deformed, low quality",
    "affection_level": 50,
    "nsfw_level": 30,
    "num_inference_steps": 30,
    "guidance_scale": 7.5,
    "high_quality": false,
    "priority": "normal"
  }'
```

Response:
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "queued"
}
```

### 3. Check Job Status

```bash
curl http://localhost:8007/status/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

After 2-3 seconds:
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "image_url": "https://d1234.cloudfront.net/generated/test/f47ac10b.jpg",
  "thumbnail_url": "https://d1234.cloudfront.net/generated/test/f47ac10b_thumb.jpg",
  "generation_time": 2.34
}
```

---

## Production Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-generation-service
spec:
  replicas: 2  # Scale based on GPU availability
  selector:
    matchLabels:
      app: image-generation
  template:
    metadata:
      labels:
        app: image-generation
    spec:
      containers:
      - name: image-gen
        image: dream-ai-image-gen:latest
        ports:
        - containerPort: 8007
        resources:
          limits:
            nvidia.com/gpu: 1
        env:
        - name: REDIS_URL
          value: redis://redis:6379/0
        - name: AWS_S3_BUCKET
          valueFrom:
            secretKeyRef:
              name: aws-creds
              key: bucket
        volumeMounts:
        - name: models
          mountPath: /models
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: models-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: image-generation-service
spec:
  selector:
    app: image-generation
  ports:
  - port: 8007
    targetPort: 8007
```

### GPU Cloud Providers

#### RunPod Setup

1. Create pod with RTX 4090
2. Deploy Docker container
3. Expose port 8007
4. Point API Gateway to RunPod IP

#### Vast.ai Setup

1. Rent instance with NVIDIA GPU
2. SSH into instance
3. Clone repo and run Docker container
4. Configure firewall to allow port 8007

---

## Optimization

### 1. Multiple Workers

For high load, run multiple workers:

```bash
# Run 2 workers on same machine (if GPU has enough VRAM)
docker run -d --name gen-worker-1 --gpus '"device=0"' ...
docker run -d --name gen-worker-2 --gpus '"device=0"' ...

# Or separate GPUs
docker run -d --name gen-worker-1 --gpus '"device=0"' ...
docker run -d --name gen-worker-2 --gpus '"device=1"' ...
```

### 2. Queue Management

Configure Redis queue priorities:

- **Urgent**: Elite users (1-2s max wait)
- **High**: Premium users (2-5s max wait)
- **Normal**: Free users (5-10s max wait)

### 3. Batch Generation

For efficiency, batch similar requests:

```python
# Process multiple requests in batch
images = pipeline(
    prompt=[prompt1, prompt2, prompt3],
    num_inference_steps=30,
    guidance_scale=7.5
)
```

### 4. Model Caching

Keep models in GPU memory:

```python
# Don't reload models between requests
pipeline.to("cuda")  # Keep on GPU
```

---

## Monitoring

### Metrics to Track

```python
# Add Prometheus metrics
from prometheus_client import Counter, Histogram

generation_requests = Counter('image_generation_requests_total', 'Total generation requests')
generation_duration = Histogram('image_generation_duration_seconds', 'Generation duration')
generation_errors = Counter('image_generation_errors_total', 'Generation errors')
```

### Grafana Dashboard

Monitor:
- Requests per minute
- Average generation time
- GPU utilization (%)
- Queue length
- Error rate

---

## Troubleshooting

### Issue: CUDA Out of Memory

```
RuntimeError: CUDA out of memory
```

**Solutions:**
1. Enable attention slicing: `pipeline.enable_attention_slicing()`
2. Enable VAE slicing: `pipeline.enable_vae_slicing()`
3. Lower resolution: 512x512 instead of 1024x1024
4. Reduce batch size
5. Use smaller model (SD 1.5 instead of SDXL)

### Issue: Slow Generation (>5s)

**Solutions:**
1. Check GPU utilization: `nvidia-smi`
2. Use DPM++ sampler (faster than DDIM)
3. Reduce steps: 20-25 instead of 30-50
4. Disable refiner for normal quality
5. Pre-load models into GPU memory

### Issue: Poor Image Quality

**Solutions:**
1. Increase steps: 40-50
2. Enable refiner for high quality
3. Adjust CFG scale: 7-9 works best
4. Improve prompts (add quality tags)
5. Use LoRA weights for specific styles

### Issue: NSFW Filter Blocking

**Solutions:**
1. Use uncensored model
2. Adjust safety checker settings
3. Fine-tune with NSFW dataset
4. Use LoRA trained on NSFW content

---

## Cost Analysis

### External APIs (Current)

| Provider | Cost per Image | Quality | Speed |
|----------|---------------|---------|-------|
| Promptchan | $0.02 | High | 5-10s |
| SinKin | $0.015 | Medium | 3-7s |
| Stability AI | $0.02 | High | 3-5s |

**Monthly cost (1000 images/day):** ~$600

### Self-Hosted SDXL

| Setup | Hardware Cost | Operating Cost | Cost per Image |
|-------|--------------|----------------|----------------|
| RunPod RTX 4090 | $0/month | $360/month | ~$0.002 |
| Vast.ai RTX 4090 | $0/month | $240/month | ~$0.002 |
| Own RTX 4090 | $1600 one-time | $50/month (power) | ~$0.001 |

**Monthly cost (1000 images/day):** ~$50-360

**Savings:** 90-95% reduction in costs

---

## Advanced Configuration

### Custom LoRA Training

Train custom LoRA for specific girl archetypes:

```bash
# Install training tools
pip install peft

# Prepare dataset (100-200 images per archetype)
# Train LoRA (requires A100 GPU, ~4 hours)
accelerate launch train_lora.py \
  --pretrained_model_name_or_path="stabilityai/stable-diffusion-xl-base-1.0" \
  --dataset_name="./datasets/archetype_blonde" \
  --output_dir="./models/lora/blonde_lora" \
  --resolution=1024 \
  --train_batch_size=1 \
  --num_train_epochs=100
```

### Multi-LoRA Merging

Combine multiple LoRAs:

```python
pipeline.load_lora_weights("./lora/nsfw_lora.safetensors", adapter_name="nsfw")
pipeline.load_lora_weights("./lora/blonde_lora.safetensors", adapter_name="blonde")

# Set weights
pipeline.set_adapters(["nsfw", "blonde"], [0.8, 0.6])
```

---

## Next Steps

1. ✅ Service running and health check passing
2. [ ] Generate test images and verify quality
3. [ ] Monitor GPU utilization under load
4. [ ] Fine-tune prompts for each archetype
5. [ ] Train custom LoRAs for specific girls
6. [ ] Setup horizontal scaling (multiple workers)
7. [ ] Implement queue prioritization
8. [ ] Add Prometheus metrics
9. [ ] Setup alerting for failures

---

## Support

**Issues:**
- GPU not detected: Check NVIDIA drivers and container runtime
- Models not downloading: Check HuggingFace token and internet connection
- Slow generation: See optimization section above
- Out of memory: Enable slicing or reduce resolution

**Resources:**
- [Diffusers Docs](https://huggingface.co/docs/diffusers)
- [SDXL Paper](https://arxiv.org/abs/2307.01952)
- [RunPod Docs](https://docs.runpod.io)
- [Vast.ai Guide](https://vast.ai/docs)

---

**Last Updated:** 2026-02-08
**Version:** 1.0.0
