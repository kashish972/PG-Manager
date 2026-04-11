# Deploy PG Manager to Google Cloud Platform

This guide covers deploying the PG Manager application to GCP using Cloud Run.

## Prerequisites

1. **Google Cloud SDK** installed and configured
   ```bash
   gcloud init
   gcloud auth login
   ```

2. **Docker** installed locally (for local testing)

3. **Enable required APIs**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
   ```

## Deployment Options

### Option 1: Cloud Run (Recommended)

#### Quick Deploy (Manual)

```bash
# Build and push to Container Registry
docker build -f Dockerfile.cloudrun -t gcr.io/PROJECT_ID/pg-manager:latest .

docker push gcr.io/PROJECT_ID/pg-manager:latest

# Deploy to Cloud Run
gcloud run deploy pg-manager \
  --image gcr.io/PROJECT_ID/pg-manager:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 8080
```

#### Automatic Deploy with Cloud Build

1. **Create a trigger** in Cloud Build:
   - Connect your GitHub repository
   - Set trigger branch to `main`
   - Use `cloudbuild.yaml` as the config file

2. **Add required environment variables** in Cloud Run:
   ```bash
   gcloud run services update pg-manager \
     --region asia-south1 \
     --set-env-vars "MONGO_URI=your-mongodb-uri,NEXTAUTH_SECRET=your-secret,NEXTAUTH_URL=https://your-domain.com"
   ```

### Option 2: Cloud Run via gcloud CLI

```bash
# Using Cloud Build to build and deploy
gcloud builds submit --config=cloudbuild.yaml
```

## Required Environment Variables

Set these in Cloud Run or your `.env.production`:

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | Yes |
| `NEXTAUTH_URL` | Application URL (e.g., https://pg-manager.run.app) | Yes |

## Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Whitelist Cloud Run IP (or use 0.0.0.0/0 for all IPs)
4. Copy the connection string to `MONGO_URI`

### Option 2: MongoDB on Compute Engine

1. Create a VM with MongoDB installed
2. Configure firewall rules
3. Use the VM's internal IP as `MONGO_URI`

## Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service pg-manager \
  --domain pg.your-domain.com \
  --region asia-south1
```

## Local Docker Testing

```bash
# Build the image
docker build -f Dockerfile.cloudrun -t pg-manager .

# Run with environment variables
docker run -p 8080:8080 \
  -e MONGO_URI="mongodb://localhost:27017/pg-manager" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="http://localhost:8080" \
  pg-manager
```

## Troubleshooting

### Build Failures
- Ensure `node_modules` is in `.dockerignore`
- Check that `npm run build` works locally

### Runtime Errors
- Verify all environment variables are set
- Check Cloud Run logs: `gcloud run services describe pg-manager --region asia-south1`

### Slow Cold Starts
- Consider increasing memory to 1Gi
- Enable minimum instances: `--min-instances 1`

## Monitoring

View logs in Cloud Logging:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=pg-manager" --limit 50
```

## Cost Optimization

- Use `--min-instances 0` for pay-per-use
- Set `--memory` and `--cpu` to minimum needed
- Use Cloud Run's automatic scaling
