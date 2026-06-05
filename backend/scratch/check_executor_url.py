import requests
import time

url = "https://evalis-backend-vvsj.onrender.com/executor-debug"
print(f"Polling {url} to fetch the live EXECUTOR_URL...")

start_time = time.time()
while time.time() - start_time < 120:  # Poll for up to 2 minutes
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            print("\n--- Live Render Environment Configuration ---")
            print("Status Code:", res.status_code)
            print("EXECUTOR_URL:", data.get("EXECUTOR_URL"))
            print("EXECUTOR_API_KEY_LENGTH:", data.get("EXECUTOR_API_KEY_LENGTH"))
            break
        else:
            print(f"Response code: {res.status_code} - Waiting for Render deploy...")
    except Exception as e:
        print("Waiting for Render to finish deploying the new endpoint...", str(e))
    time.sleep(10)
else:
    print("Polling timed out.")
