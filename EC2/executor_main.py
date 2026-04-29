import docker
import time
from fastapi import FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

app = FastAPI()
client = docker.from_env()

# Simple security to prevent random people from abusing your EC2 server
API_KEY = "your_super_secret_execution_key_here"
api_key_header = APIKeyHeader(name="X-API-Key")

class ExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    input_data: str = ""

def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized execution request")
    return api_key

@app.post("/execute")
def execute_code(payload: ExecutionRequest, api_key: str = Security(get_api_key)):
    if payload.language != "python":
        raise HTTPException(status_code=400, detail="Unsupported language")
    
    # 1. Prepare the execution script
    code_script = f"""
import sys
input_data = '''{payload.input_data}'''
# Simulate stdin
sys.stdin = open('/dev/tty', 'r') if not input_data else type('StringReader', (), {{'read': lambda: input_data}})()
{payload.code}
"""
    
    start_time = time.time()
    try:
        # 2. Spin up the Sandbox
        container = client.containers.run(
            "python:3.9-slim",
            command=["python", "-c", code_script],
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
    
    exec_time = round(time.time() - start_time, 3)

    return {
        "status": "success" if not error else "error",
        "output": output,
        "error": error,
        "execution_time_seconds": exec_time
    }
