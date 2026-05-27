import docker
import time
import base64
from fastapi import FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI()
client = docker.from_env()

# Simple security to prevent random people from abusing your EC2 server
API_KEY = "your_super_secret_execution_key_here"
api_key_header = APIKeyHeader(name="X-API-Key")

class ExecutionRequest(BaseModel):
    code: Optional[str] = ""
    language: Optional[str] = "python"
    input_data: Optional[str] = ""

def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized execution request")
    return api_key

@app.post("/execute")
def execute_code(payload: ExecutionRequest, api_key: str = Security(get_api_key)):
    # Safely normalize language parameter
    lang = str(payload.language or "python").strip().lower()
    if lang not in ["python", "cpp", "c"]:
        raise HTTPException(status_code=400, detail="Unsupported language")
    
    # Safely handle null strings
    code_str = str(payload.code or "")
    input_str = str(payload.input_data or "")
    
    # Base64 encode code and input to avoid shell escaping issues
    code_b64 = base64.b64encode(code_str.encode("utf-8")).decode("utf-8")
    input_b64 = base64.b64encode(input_str.encode("utf-8")).decode("utf-8")
    
    if lang == "python":
        image = "python:3.9-slim"
        cmd = [
            "sh", "-c",
            f"echo '{code_b64}' | base64 -d > script.py && echo '{input_b64}' | base64 -d | python script.py"
        ]
    elif lang == "cpp":
        image = "gcc:latest"
        cmd = [
            "sh", "-c",
            f"echo '{code_b64}' | base64 -d > source.cpp && g++ -O3 source.cpp -o program && echo '{input_b64}' | base64 -d | ./program"
        ]
    elif lang == "c":
        image = "gcc:latest"
        cmd = [
            "sh", "-c",
            f"echo '{code_b64}' | base64 -d > source.c && gcc -O3 source.c -o program && echo '{input_b64}' | base64 -d | ./program"
        ]
    
    start_time = time.time()
    try:
        # Spin up the Sandbox container
        container = client.containers.run(
            image,
            command=cmd,
            detach=False,
            # Security Boundaries
            mem_limit="128m",       # Prevent Out of Memory attacks
            cpu_period=100000,
            cpu_quota=50000,        # Max 50% of CPU
            network_disabled=True,  # No internet access for student code
            remove=True,            # Auto-delete container after run
            pids_limit=50,          # Prevent fork bombs
            stdout=True,
            stderr=True
        )
        output = container.decode("utf-8")
        error = None
    except docker.errors.ContainerError as e:
        output = ""
        error = e.stderr.decode("utf-8")
    except Exception as e:
        output = ""
        error = str(e)
    
    exec_time = round(time.time() - start_time, 3)

    return {
        "status": "success" if not error else "error",
        "output": output,
        "error": error,
        "execution_time_seconds": exec_time
    }
