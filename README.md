# Compound Voice

A compound AI voice assistant using [Compound-beta](https://console.groq.com/docs/agentic-tooling/compound-beta) on Groq and LiveKit, equipped with internet search tool use capabilities.


## Quickstart

### Hosted:
To use Compound Voice, you can visit the hosted version [here](https://compound-voice-frontend.vercel.app/)

### Run locally:
Alternatively, you can run Compound Voice locally. 


#### Prerequisites
- Python 3.12
- pnpm (for frontend)
- API keys from Groq and LiveKit
- (Optional, if hosting on GCP) GCP project ID


#### Step 1
Create a .env file in the agent/ directory with the following variables:
```
LIVEKIT_URL=YOUR_LIVEKIT_URL
LIVEKIT_API_KEY=YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=YOUR_LIVEKIT_API_SECRET

# Optional for local development
GROQ_API_KEY=YOUR_GROQ_API_KEY

# If hosting on GCP
GCP_PROJECT_ID=YOUR_GCP_PROJECT_ID
```
#### Step 2
Create a .env.local file in the client/web/ directory with:
```
# LiveKit API Configuration
LIVEKIT_API_KEY=YOUR_API_KEY
LIVEKIT_API_SECRET=YOUR_API_SECRET

# Public configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://YOUR_LIVEKIT_URL

# If hosting on GCP
GCP_PROJECT_ID=YOUR_GCP_PROJECT_ID
```  

#### Step 3
To set up the backend agent, navigate to the agent directory:
```bash
cd agent
```
Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Run the agent:
```bash
python main.py dev
# or: python main.py console
```

#### Step 4
To set up the frontend, navigate to the web client directory:
```bash
cd client/web
```
Install dependencies:
```bash
pnpm install
```
Start the development server:
```bash
pnpm dev
```

#### Step 5
To access the app, open a web browser and navigate to:
`http://localhost:3000`

> *Why is there no backend server that connects to the frontend?*   
LiveKit agents don't expose their own HTTP ports or URLs locally. Everything is handled by its outbound connections with the LiveKit server. The frontend link is all you need!

## Deployment

Create one GCP service for the agent and one GCP service for the frontend. Then, build and push the Docker images:

```bash
cd agent  
docker build -t us-west1-docker.pkg.dev/<YOUR_GCP_PROJECT_ID>/<YOUR_GCP_REPOSITORY>/<YOUR_AGENT_SERVICE_NAME>:latest -f agent/Dockerfile.agent --platform linux/amd64 ./agent

docker push us-west1-docker.pkg.dev/<YOUR_GCP_PROJECT_ID>/<YOUR_GCP_REPOSITORY>/<YOUR_AGENT_SERVICE_NAME>:latest
```
```bash
cd client/web
docker build --build-arg NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-url.com -t us-west1-docker.pkg.dev/<YOUR_GCP_PROJECT_ID>/<YOUR_GCP_REPOSITORY>/<YOUR_FRONTEND_SERVICE_NAME>:latest -f client/web/Dockerfile --platform linux/amd64 ./client/web

docker push us-west1-docker.pkg.dev/<YOUR_GCP_PROJECT_ID>/<YOUR_GCP_REPOSITORY>/<YOUR_FRONTEND_SERVICE_NAME>:latest
```

## Contributing
Improvements through PRs are welcome!

## Changelog

## Future Features
- Improved animations for the title card and AI agent (indicate loading state)
