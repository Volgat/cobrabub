#!/usr/bin/env python3
"""
CobraBub Agent Server
WebSocket-based server for handling AI agent tasks
Supports multiple LLM providers and local models
"""

import asyncio
import json
import websockets
import os
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime

# Try to import optional dependencies
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class AgentTask:
    """Represents an agent task with state tracking"""
    
    def __init__(self, task_id: str, instruction: str, task_type: str = "chat"):
        self.task_id = task_id
        self.instruction = instruction
        self.task_type = task_type
        self.status = "pending"  # pending, running, completed, failed
        self.result = None
        self.error = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict:
        return {
            "task_id": self.task_id,
            "instruction": self.instruction,
            "task_type": self.task_type,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class ModelProvider:
    """Base class for model providers"""
    
    async def generate(self, prompt: str, context: Dict) -> str:
        raise NotImplementedError
    
    def validate_config(self, config: Dict) -> bool:
        raise NotImplementedError


class OpenAIProvider(ModelProvider):
    """OpenAI API provider (also supports OpenAI-compatible APIs)"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None, model_name: str = "gpt-4"):
        if not OPENAI_AVAILABLE:
            raise ImportError("openai package not installed. Run: pip install openai")
        
        self.api_key = api_key
        self.base_url = base_url or "https://api.openai.com/v1"
        self.model_name = model_name
        
        # Configure OpenAI client with custom base URL for compatible APIs
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url if base_url else None
        )
    
    def validate_config(self, config: Dict) -> bool:
        return bool(config.get("api_key")) and bool(config.get("model_name"))
    
    async def generate(self, prompt: str, context: Dict) -> str:
        messages = self._build_messages(prompt, context)
        
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=context.get("model_name", self.model_name),
                messages=messages,
                max_tokens=4096,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def _build_messages(self, prompt: str, context: Dict) -> List[Dict]:
        messages = []
        
        # System message
        messages.append({
            "role": "system",
            "content": "You are an expert programming assistant integrated into CobraBub IDE. Help users with coding tasks, code review, debugging, and project analysis."
        })
        
        # Add file context
        files = context.get("files", [])
        if files:
            file_context = "Here are the current open files:\n\n"
            for file in files:
                file_context += f"File: {file['name']}\n```\n{file['content']}\n```\n\n"
            
            messages.append({
                "role": "user",
                "content": file_context
            })
        
        # User prompt
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        return messages


class AnthropicProvider(ModelProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, api_key: str, model_name: str = "claude-3-sonnet-20240229"):
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("anthropic package not installed. Run: pip install anthropic")
        
        self.api_key = api_key
        self.model_name = model_name
        self.client = anthropic.Anthropic(api_key=api_key)
    
    def validate_config(self, config: Dict) -> bool:
        return bool(config.get("api_key")) and bool(config.get("model_name"))
    
    async def generate(self, prompt: str, context: Dict) -> str:
        messages = self._build_messages(prompt, context)
        
        try:
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=context.get("model_name", self.model_name),
                max_tokens=4096,
                system="You are an expert programming assistant integrated into CobraBub IDE.",
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    def _build_messages(self, prompt: str, context: Dict) -> List[Dict]:
        messages = []
        
        # Add file context
        files = context.get("files", [])
        if files:
            for file in files:
                messages.append({
                    "role": "user",
                    "content": f"File: {file['name']}\n```\n{file['content']}\n```"
                })
        
        # User prompt
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        return messages


class LocalModelProvider(ModelProvider):
    """Local model provider (supports Ollama, LM Studio, vLLM, etc.)"""
    
    def __init__(self, base_url: str, model_name: str = "llama2"):
        self.base_url = base_url.rstrip('/')
        self.model_name = model_name
        self.session = None
    
    def validate_config(self, config: Dict) -> bool:
        return bool(config.get("base_url")) and bool(config.get("model_name"))
    
    async def generate(self, prompt: str, context: Dict) -> str:
        import aiohttp
        
        try:
            async with aiohttp.ClientSession() as session:
                # Try Ollama format first
                payload = {
                    "model": context.get("model_name", self.model_name),
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "max_tokens": 4096
                    }
                }
                
                # Try Ollama API endpoint
                try:
                    async with session.post(
                        f"{self.base_url}/api/generate",
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=120)
                    ) as response:
                        result = await response.json()
                        if "response" in result:
                            return result["response"]
                except Exception:
                    pass
                
                # Try OpenAI-compatible format (LM Studio, vLLM, etc.)
                payload = {
                    "model": context.get("model_name", self.model_name),
                    "messages": [
                        {"role": "system", "content": "You are an expert programming assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 4096,
                    "temperature": 0.7,
                    "stream": False
                }
                
                async with session.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    result = await response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        return result["choices"][0]["message"]["content"]
                    
        except Exception as e:
            raise Exception(f"Local model error ({self.base_url}): {str(e)}")
        
        raise Exception(f"Local model at {self.base_url} did not respond with valid format")


class AgentServer:
    """Main agent server with WebSocket support"""
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: set = set()
        self.tasks: Dict[str, AgentTask] = {}
        self.providers: Dict[str, ModelProvider] = {}
        self.current_provider: Optional[ModelProvider] = None
        self.model_config: Dict = {}
    
    def setup_provider(self, config: Dict):
        """Setup model provider based on configuration"""
        provider_type = config.get("type", "openai")
        
        try:
            if provider_type == "openai":
                self.current_provider = OpenAIProvider(
                    api_key=config.get("api_key", ""),
                    base_url=config.get("baseUrl"),
                    model_name=config.get("modelName", "gpt-4")
                )
            elif provider_type == "anthropic":
                self.current_provider = AnthropicProvider(
                    api_key=config.get("api_key", ""),
                    model_name=config.get("modelName", "claude-3-sonnet-20240229")
                )
            elif provider_type == "local":
                self.current_provider = LocalModelProvider(
                    base_url=config.get("baseUrl", "http://localhost:11434"),
                    model_name=config.get("modelName", "llama2")
                )
            elif provider_type == "custom":
                # Custom provider treated as OpenAI-compatible API
                self.current_provider = OpenAIProvider(
                    api_key=config.get("api_key", ""),
                    base_url=config.get("baseUrl"),
                    model_name=config.get("modelName", "custom-model")
                )
            else:
                # Default to OpenAI-compatible API
                self.current_provider = OpenAIProvider(
                    api_key=config.get("api_key", ""),
                    base_url=config.get("baseUrl"),
                    model_name=config.get("modelName", "gpt-4")
                )
            
            self.model_config = config
            print(f"✓ Provider setup: {provider_type} ({config.get('modelName', 'default')})")
            
        except Exception as e:
            print(f"✗ Failed to setup provider: {e}")
            self.current_provider = None
    
    async def register(self, websocket):
        """Register a new client connection"""
        self.clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.clients)}")
        
        try:
            await websocket.send(json.dumps({
                "type": "connected",
                "message": "Connected to CobraBub Agent Server"
            }))
        except Exception as e:
            print(f"Error sending welcome message: {e}")
    
    async def unregister(self, websocket):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(self.clients)}")
    
    async def handle_message(self, websocket, message: str):
        """Handle incoming message from client"""
        try:
            data = json.loads(message)
            print(f"Received: {data.get('type', 'unknown')} task")
            
            # Update model config if provided
            if "modelConfig" in data and data["modelConfig"]:
                self.setup_provider(data["modelConfig"])
            
            # Handle different message types
            if data.get("task") == "agent":
                await self.run_agent_task(websocket, data)
            else:
                await self.run_chat_task(websocket, data)
                
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "type": "error",
                "error": "Invalid JSON format"
            }))
        except Exception as e:
            print(f"Error handling message: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "error": str(e)
            }))
    
    async def run_chat_task(self, websocket, data: Dict):
        """Run a simple chat task"""
        task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        task = AgentTask(task_id, data.get("message", ""), "chat")
        self.tasks[task_id] = task
        
        try:
            task.status = "running"
            
            if not self.current_provider:
                raise Exception("No model provider configured")
            
            prompt = data.get("message", "")
            context = {
                "files": data.get("files", []),
                "activeFile": data.get("activeFile"),
                "model_name": self.model_config.get("modelName", "gpt-4")
            }
            
            response = await self.current_provider.generate(prompt, context)
            
            task.status = "completed"
            task.result = response
            
            await websocket.send(json.dumps({
                "type": "response",
                "content": response,
                "task_id": task_id
            }))
            
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            
            await websocket.send(json.dumps({
                "type": "error",
                "error": str(e),
                "task_id": task_id
            }))
    
    async def run_agent_task(self, websocket, data: Dict):
        """Run an autonomous agent task"""
        task_id = f"agent_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        task = AgentTask(task_id, data.get("instruction", ""), "agent")
        self.tasks[task_id] = task
        
        try:
            task.status = "running"
            
            if not self.current_provider:
                raise Exception("No model provider configured")
            
            instruction = data.get("instruction", "")
            files = data.get("files", [])
            project_path = data.get("projectPath", "")
            
            # Build comprehensive context
            context = {
                "files": files,
                "projectPath": project_path,
                "model_name": self.model_config.get("modelName", "gpt-4"),
                "taskType": "agent"
            }
            
            # Create agent prompt
            agent_prompt = f"""You are an autonomous coding agent in CobraBub IDE.

Instruction: {instruction}

Current Project Files:
"""
            
            for file in files:
                agent_prompt += f"\n### {file['name']} ###\n{file['content']}\n"
            
            agent_prompt += """
Provide a detailed response with:
1. Analysis of the current code
2. Specific suggestions for improvement
3. Code examples where applicable
4. Step-by-step implementation plan

Be concise but thorough. Focus on actionable insights."""
            
            response = await self.current_provider.generate(agent_prompt, context)
            
            task.status = "completed"
            task.result = response
            
            # Send response
            await websocket.send(json.dumps({
                "type": "response",
                "content": response,
                "task_id": task_id,
                "task_complete": True
            }))
            
            # Also send as task completion
            await websocket.send(json.dumps({
                "type": "task_complete",
                "description": f"Agent task completed: {instruction[:50]}...",
                "task_id": task_id
            }))
            
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            
            await websocket.send(json.dumps({
                "type": "error",
                "error": str(e),
                "description": "Agent task failed",
                "task_id": task_id
            }))
    
    async def handler(self, websocket, path):
        """WebSocket connection handler"""
        await self.register(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        finally:
            await self.unregister(websocket)
    
    async def start(self):
        """Start the agent server"""
        print(f"🚀 CobraBub Agent Server starting on ws://{self.host}:{self.port}")
        
        async with websockets.serve(self.handler, self.host, self.port):
            print(f"✓ Server ready at ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="CobraBub Agent Server")
    parser.add_argument("--host", default="localhost", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    args = parser.parse_args()
    
    server = AgentServer(host=args.host, port=args.port)
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\nShutting down server...")
    except Exception as e:
        print(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
