# LiveKit Voice Agent Architecture

This document provides a comprehensive breakdown of how the LiveKit voice agent works, including its components, data flow, and key features.

## Overview

The LiveKit voice agent is a real-time conversational AI agent run on Groq that combines speech-to-text (STT), large language model (LLM) processing, and text-to-speech (TTS) capabilities. It's designed to be hosted locally or deployed on Google Cloud Run and uses Groq's APIs for all AI processing.

## Core Components

### **Main Agent (`main.py`)**
The central orchestrator that handles the entire conversation pipeline.

#### Key Classes:
- **`GroqAgent`**: Custom LiveKit Agent class that loads system instructions
- **`CustomGroqLLM`**: Modified LLM wrapper that extracts tool execution results from Groq's compound-beta model
- **`CustomGroqLLMStream`**: Stream implementation for real-time response handling (soon to be upgraded to use compound-beta's built-in stream)

### **System Prompt (`system_prompt.txt`)**
Defines the agent's personality and behavior:
- Conversational, direct responses (under 25 words when possible)
- Specialized handling for tool calling queries, like sports scores and news headlines
- Numbers must be written out in word form (e.g., "22" → "twenty-two") to assist the TTS

### **Health Server (`health_server.py`)**
Minimal HTTP server for Google Cloud Run health checks, required for deployment on Cloud Run.

## Key Features

### 1. **API Key Management**
The agent supports multiple methods for API key retrieval:
- **Environment Variables**: `GROQ_API_KEY` from environment for development or if you wish to provide the user with an API key
- **Participant Metadata**: API key passed through LiveKit participant metadata so the user can submit their own API key

### 2. **Tool Execution & Search Results**
The agent uses Groq's compound-beta model which has built-in tool execution capabilities:
- Automatically searches for current information when needed
- Extracts search results from the LLM response
- Sends structured search results to the frontend via LiveKit's data channel
- Results include title, URL, and relevance score

### 3. **Voice Activity Detection (VAD)**
Uses LiveKit and Silero VAD model for:
- Detecting when user starts/stops speaking
- Prewarmed during startup for faster response times
- Enables natural conversation flow

### 4. **Real-time Processing Pipeline**
1. **Speech Input**: User speaks into microphone
2. **VAD Detection**: Silero detects speech boundaries
3. **STT Processing**: Groq Whisper converts speech to text
4. **LLM Processing**: Compound-beta processes text and executes tools if needed
5. **Response Generation**: LLM generates conversational response
6. **TTS Synthesis**: Groq TTS converts response to speech
7. **Audio Output**: User hears the response


## Data Flow Details

### **Initialization Sequence**
```python
# 1. Load system prompt
system_prompt = load_system_prompt()

# 2. Retrieve API key (env or participant metadata)
api_key = get_api_key_from_env() or await get_api_key_from_participants(ctx)

# 3. Create custom LLM with room reference for compound-beta compatiblity
custom_llm = CustomGroqLLM(model="compound-beta", api_key=api_key, room=ctx.room)

# 4. Initialize session with STT, LLM, TTS, and VAD
session = AgentSession(stt=groq_stt, llm=custom_llm, tts=groq_tts, vad=silero_vad)
```


### **Tool Results Communication**
The agent sends structured data to the frontend:
```json
{
  "type": "tool_results",
  "data": [
    {
      "title": "Search Result Title",
      "url": "https://example.com",
      "score": 0.95
    }
  ]
}
```

## Custom LLM Implementation

### Why Custom LLM?
The standard LiveKit Groq plugin doesn't support extracting the `executed_tools` field from compound-beta responses. The custom implementation:

1. **Extends Base LLM**: Inherits from LiveKit's LLM base class
2. **Direct API Calls**: Makes direct calls to Groq's API
3. **Tool Extraction**: Parses `executed_tools` from responses
4. **Frontend Communication**: Sends search results to frontend via data channel
5. **Stream Compatibility**: Implements custom stream for LiveKit integration

### Key Methods:
```python
class CustomGroqLLM(LLM):
    def chat(self, chat_ctx, ...):
        # Returns async context manager
        
    def _convert_messages(self, chat_ctx):
        # Converts LiveKit ChatContext to Groq format
        
    async def __aenter__(self):
        # Makes API call and extracts tools
```


## Extending the Agent

### Adding New Tools
The compound-beta model supports various tools. To handle additional, supported tool types:

1. **Extend Tool Parser**:
```python
def extract_new_tool_results(executed_tools):
    # Parse new tool type from executed_tools
    pass
```

2. **Update Frontend Communication**:
```python
await room.local_participant.publish_data(
    payload=json.dumps({
        "type": "new_tool_results", 
        "data": results
    }).encode('utf-8')
)
```

### Customizing Behavior
Modify `system_prompt.txt` to change:
- Response style and length
- Specialized handling for different query types
- Search triggers and formatting
- Follow-up question patterns