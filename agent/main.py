from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli, JobProcess
from livekit.plugins import silero, groq
from livekit.agents.llm import ChatChunk, ChatContext, LLM, LLMStream
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS
from dotenv import load_dotenv
import os
import traceback
import asyncio
import json
from typing import Any, Optional
import threading
from health_server import run_health_server

load_dotenv()


def get_api_key_from_env():
    """
    Get the API key from environment variables as fallback.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        print("Using GROQ_API_KEY from environment variable")
        return api_key
    
    print("[DEBUG] GROQ_API_KEY not found in environment variables.")
    return None


async def get_api_key_from_participants(ctx: JobContext):
    """
    Get the API key from participant metadata.
    """
    if not ctx.room:
        return None
    
    # Wait a moment for participants to fully connect and metadata to be available
    # await asyncio.sleep(0.5)
        
    # Check current participants
    all_participants = list(ctx.room.remote_participants.values())
    if ctx.room.local_participant:
        all_participants.append(ctx.room.local_participant)
        
    for participant in all_participants:
        if participant and participant.metadata:
            try:
                metadata = json.loads(participant.metadata)
                if 'groq_api_key' in metadata:
                    print(f"Using GROQ_API_KEY from participant {participant.identity} metadata")
                    return metadata['groq_api_key']
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"Error parsing participant metadata: {e}")
    
    print("[DEBUG] No GROQ_API_KEY found in any participant metadata")
    return None


def prewarm(proc: JobProcess):
    """
    Load the VAD model during prewarm for faster startup.
    """
    proc.userdata["vad"] = silero.VAD.load()


def load_system_prompt(path="system_prompt.txt"):
    """
    Load the system prompt from the file.
    """
    with open(path, "r") as f:
        return f.read()


def extract_search_results_from_executed_tools(executed_tools):
    """
    Parse and structure search results from compound-beta's tool execution output, extracting title, URL, and relevance score for each result.
    """
    results = []
    
    if not executed_tools:
        return results
    
    try:
        for tool in executed_tools:
            if hasattr(tool, 'type') and tool.type == 'search':
                if hasattr(tool, 'search_results') and tool.search_results:
                    if hasattr(tool.search_results, 'results') and tool.search_results.results:
                        for result in tool.search_results.results:
                            if hasattr(result, 'title') and hasattr(result, 'url') and hasattr(result, 'score'):
                                search_result = {
                                    "title": result.title,
                                    "url": result.url,
                                    "score": result.score
                                }
                                results.append(search_result)
                                print(f"[DEBUG] Extracted structured search result: {search_result}")
        
        print(f"[DEBUG] Total extracted results: {len(results)}")
        
    except Exception as e:
        print(f"[DEBUG] Error extracting search results: {e}")
        traceback.print_exc()
    
    return results


async def send_tool_results_to_frontend(results, room):
    """
    Send tool results to the frontend via LiveKit's publish_data method.
    """
    if results and room:
        try:
            await room.local_participant.publish_data(
                payload=json.dumps({
                    "type": "tool_results",
                    "data": results
                }).encode('utf-8')
            )
            print(f"[DEBUG] Successfully sent {len(results)} tool results to frontend")
        except Exception as e:
            print(f"[DEBUG] Error sending tool results to frontend: {e}")


class CustomGroqLLM(LLM):
    """
    Custom Groq LLM that extracts executed_tools from compound-beta responses.

    Why do we need this? -> To extract the executed_tools field from Groq's compound-beta responses, we can't simply use the standard groq.LLM from LiveKit. 
    So, we create a modified LLM class that extends the standard groq.LLM and overrides the chat method to extract the executed_tools field.
    """
    
    def __init__(self, model: str = "compound-beta", api_key: str = None, room = None):
        super().__init__()
        self.model = model
        self.api_key = api_key
        self.room = room
        # Use the regular Groq client for API calls
        from groq import Groq
        self._client = Groq(api_key=api_key)
        
    def chat(
        self,
        chat_ctx: ChatContext,
        conn_ctx: Optional[Any] = None,
        fnc_ctx: Optional[Any] = None,
        tools: Optional[Any] = None,
        **kwargs
    ):
        """
        Main chat method that returns an async context manager.
        """
        
        class ChatContextManager:
            def __init__(self, llm_instance, chat_ctx, conn_ctx, fnc_ctx, tools, kwargs):
                self.llm = llm_instance
                self.chat_ctx = chat_ctx
                self.conn_ctx = conn_ctx
                self.fnc_ctx = fnc_ctx
                self.tools = tools
                self.kwargs = kwargs
                self.stream = None
            
            async def __aenter__(self):
                # Convert ChatContext messages to Groq format
                messages = self.llm._convert_messages(self.chat_ctx)
                request_id = "unknown_request_id"
                
                try:
                    print(f"[DEBUG] Making Groq API call with {len(messages)} messages")
                    response = self.llm._client.chat.completions.create(
                        messages=messages,
                        model=self.llm.model,
                        stream=False,  # TODO: Change to True, update LLMStream to use compound-beta's native stream
                    )
                    
                    if hasattr(response, 'id') and response.id:
                        request_id = response.id

                    # Extract executed_tools if available
                    choice = response.choices[0]
                    executed_tools = None
                    
                    if hasattr(choice.message, 'executed_tools'):
                        executed_tools = choice.message.executed_tools
                        # print(f"[DEBUG] Found executed_tools: {executed_tools}")
                        
                        # Extract and send search results
                        search_results = extract_search_results_from_executed_tools(executed_tools)
                        if search_results:
                            await send_tool_results_to_frontend(search_results, self.llm.room)
                    else:
                        print(f"[DEBUG] No executed_tools found in response")
                    
                    # Create a stream that yields the complete response
                    self.stream = CustomGroqLLMStream(
                        llm=self.llm,
                        chat_ctx=self.chat_ctx, 
                        fnc_ctx=self.fnc_ctx,
                        conn_options=self.conn_ctx,
                        request_id=request_id,
                        content=choice.message.content,
                        executed_tools=executed_tools,
                        tools=self.tools
                    )
                    return self.stream
                    
                except Exception as e:
                    print(f"[DEBUG] Error in Groq API call: {e}")
                    traceback.print_exc()
                    self.stream = CustomGroqLLMStream(
                        llm=self.llm,
                        chat_ctx=self.chat_ctx,
                        fnc_ctx=self.fnc_ctx,
                        conn_options=self.conn_ctx,
                        request_id=request_id,
                        content="I apologize, but I encountered an error processing your request.",
                        executed_tools=None,
                        tools=self.tools
                    )
                    return self.stream
            
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                # Cleanup if needed
                pass
        
        return ChatContextManager(self, chat_ctx, conn_ctx, fnc_ctx, tools, kwargs)

    def _convert_messages(self, chat_ctx: ChatContext):
        """
        Convert ChatContext items to Groq format.
        """
        converted = []
        
        # Access items from ChatContext instead of messages
        for item in chat_ctx.items:
            # Each item is a ChatMessage with role and content
            if hasattr(item, 'role') and hasattr(item, 'content'):
                # Handle content properly - it might be a list or string
                content = item.content
                if isinstance(content, list):
                    # If content is a list, extract text content
                    text_content = ""
                    for content_item in content:
                        if hasattr(content_item, 'text'):
                            text_content += content_item.text
                        elif isinstance(content_item, str):
                            text_content += content_item
                    content = text_content
                elif hasattr(content, 'text'):
                    content = content.text
                
                converted.append({
                    "role": item.role,
                    "content": str(content) if content else ""
                })
        
        return converted


class CustomGroqLLMStream(LLMStream):
    """
    Custom stream implementation for our Groq LLM. A workaround so that our custom LLM can integrate with LiveKit.
    TODO: Use compound-beta's native stream implementation instead.
    """
    
    def __init__(self, llm: LLM, chat_ctx: ChatContext, fnc_ctx: Optional[Any], 
                 conn_options: Optional[Any], request_id: str, content: str, 
                 executed_tools: Optional[Any] = None, tools: Optional[Any] = None):
        actual_conn_options = conn_options if conn_options is not None else DEFAULT_API_CONNECT_OPTIONS
        
        super().__init__(
            llm, 
            chat_ctx=chat_ctx, 
            tools=tools or [], 
            conn_options=actual_conn_options
        )
        self.request_id = request_id
        self.content = content
        self.executed_tools = executed_tools
        self.fnc_ctx = fnc_ctx
        self._sent = False
        
    async def _run(self):
        """
        Abstract method from LLMStream. Minimal implementation to satisfy the abstract class requirement.
        """
        pass

    async def __anext__(self) -> ChatChunk:
        if self._sent:
            raise StopAsyncIteration
            
        self._sent = True
        
        # Create a chat chunk with the complete response using correct LiveKit Agents 1.0 structure
        from livekit.agents.llm import ChoiceDelta
        return ChatChunk(
            id=self.request_id,
            delta=ChoiceDelta(
                role="assistant",
                content=self.content
            )
        )
    
    def __aiter__(self):
        return self


class GroqAgent(Agent):
    """
    Custom LiveKit Agent class for loading system prompt instructions.
    """
    
    def __init__(self):
        # Load system prompt
        system_prompt = load_system_prompt()
        
        super().__init__(
            instructions=system_prompt
        )


async def entrypoint(ctx: JobContext):
    """
    The main function for the LiveKit process.
    """
    try:
        # Try to get API key from environment first
        retrieved_groq_api_key = get_api_key_from_env()
        
        # Connect to the room first so we can access participant metadata
        await ctx.connect()
        
        # If no API key from env, try to get from participant metadata (now that we're connected)
        if not retrieved_groq_api_key:
            retrieved_groq_api_key = await get_api_key_from_participants(ctx)
        
        if not retrieved_groq_api_key:
            print("No GROQ_API_KEY available from environment or participant metadata. Exiting.")
            return
        
        # Create custom LLM instance for session
        custom_llm = CustomGroqLLM(
            model="compound-beta",
            api_key=retrieved_groq_api_key,
            room=ctx.room
        )
        
        # Create the LiveKit session with custom LLM
        session = AgentSession(
            stt=groq.STT(
                model="whisper-large-v3-turbo",
                language="en",
                api_key=retrieved_groq_api_key
            ),
            llm=custom_llm,
            tts=groq.TTS(
                model="playai-tts",
                voice="Celeste-PlayAI", 
                api_key=retrieved_groq_api_key
            ),
            vad=ctx.proc.userdata["vad"]
        )
                
        # Start the session with the agent
        await session.start(agent=GroqAgent(), room=ctx.room)
        
        # Send initial greeting using say() instead of generate_reply()
        await session.say("Hi, how can I help you today?")

        # Notify frontend that agent greeting is finished
        await ctx.room.local_participant.publish_data(
            payload=json.dumps({
                "type": "agent_greeting_finished",
            }).encode('utf-8')
        )
        print("[DEBUG] Sent agent_greeting_finished message to frontend")
        
    except Exception as e:
        print(f"Fatal error in entrypoint: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    # Start the health check server in a separate thread
    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()
    
    # Run the LiveKit agent
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
    ))