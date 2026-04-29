import os
import requests
from dotenv import load_dotenv

load_dotenv()

# The URL of your new EC2 Microservice
EXECUTOR_URL = os.getenv("EXECUTOR_URL", "http://YOUR_EC2_IP_ADDRESS:8000/execute")
EXECUTOR_API_KEY = os.getenv("EXECUTOR_API_KEY", "your_super_secret_execution_key_here")

def execute_in_docker(code: str, input_data: str, language: str = "python"):
    """
    This function used to run Docker locally. 
    Now it forwards the payload to our secure EC2 microservice!
    """
    payload = {
        "code": code,
        "language": language,
        "input_data": input_data
    }
    
    headers = {
        "X-API-Key": EXECUTOR_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        # Make a synchronous HTTP request to the EC2 server
        response = requests.post(EXECUTOR_URL, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            output = data.get("output", "")
            error_msg = data.get("error")
            exec_time = data.get("execution_time_seconds", 0)

            if data.get("status") == "error" or error_msg:
                # Return Runtime Error
                return None, {"type": "RE", "message": error_msg or "Runtime Error"}, exec_time
            
            # Return Success
            return output.strip(), None, exec_time
            
        else:
            return None, {"type": "RE", "message": f"Execution Server Error: {response.text}"}, 0

    except requests.exceptions.Timeout:
        # Hard Time Limit Exceeded
        return None, {"type": "TLE", "message": "Time Limit Exceeded"}, 10.0

    except Exception as e:
        # Connection error (EC2 is down or wrong IP)
        return None, {"type": "RE", "message": f"Failed to connect to EC2 Sandbox: {str(e)}"}, 0