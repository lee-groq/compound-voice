# LiveKit Agent for GCP Cloud Run

This is a LiveKit voice agent that can be deployed to GCP Cloud Run.

## Prerequisites

- GCP Project with Cloud Run enabled
- Google Cloud Secret Manager with `groq-api-key` secret
- LiveKit server instance with API key and secret

## Environment Variables

The following environment variables must be set in Cloud Run:

```
LIVEKIT_URL=<your LiveKit server URL>
LIVEKIT_API_KEY=<your API Key>
LIVEKIT_API_SECRET=<your API Secret>
GCP_PROJECT_ID=<your GCP project ID>
```

Optional (if not using Secret Manager):
```
GROQ_API_KEY=<your Groq API key>
```

## Deployment

Build and push the Docker image:

```bash
# Build the image
docker build -t us-west1-docker.pkg.dev/groqlabs-demo-1/compound-beta-voice-repo/compound-beta-agent:latest -f agent/Dockerfile.agent --platform linux/amd64 ./agent

# Push to GCP Artifact Registry
docker push us-west1-docker.pkg.dev/groqlabs-demo-1/compound-beta-voice-repo/compound-beta-agent:latest
```

## Local Development

1. Create a `.env` file with your environment variables
2. Install dependencies: `pip install -r requirements.txt`
3. Run the agent: `python main.py start`

## Architecture

- The agent connects to LiveKit server via WebSocket (outbound only)
- No inbound ports are exposed
- API keys are retrieved from GCP Secret Manager or environment variables
- The agent uses Groq's compound-beta model for LLM capabilities 