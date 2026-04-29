import os
import sys
import uvicorn
import traceback

if __name__ == "__main__":
    try:
        port = int(os.environ.get("PORT", 10000))
        print(f"Starting Uvicorn on port {port}...", flush=True)
        uvicorn.run("app.main:app", host="0.0.0.0", port=port)
    except Exception as e:
        print("CRASHED ON STARTUP!", flush=True)
        traceback.print_exc()
        sys.exit(1)
