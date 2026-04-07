import subprocess
import os
import time
import uuid

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DIR = os.path.join(BASE_DIR, "temp")

if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)


# DOCKER EXECUTER
def execute_in_docker(code: str, input_data: str, language: str = "python"):
    file_id = uuid.uuid4().hex
    container_dir = f"/app/{file_id}"

    if language == "python":
        file_name = f"{file_id}.py"
    elif language == "cpp":
        file_name = f"{file_id}.cpp"
    elif language == "c":
        file_name = f"{file_id}.c"
    else:
        return None, {"type": "RE", "message": "Unsupported language"}, 0

    file_path = os.path.join(TEMP_DIR, file_name)

    try:
        start_time = time.time()

        # WRITE FILE
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)

        input_data = (input_data or "").rstrip() + "\n"

        # CREATE ISOLATED DIR
        subprocess.run(
            ["docker", "exec", "code_runner", "mkdir", "-p", container_dir],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        # COPY FILE 
        subprocess.run(
            ["docker", "cp", file_path, f"code_runner:{container_dir}/{file_name}"],
            check=True
        )

        exec_cmd = ""

        # COMPILE (IF NEEDED)
        if language == "cpp":
            compile_cmd = f"g++ {container_dir}/{file_name} -o {container_dir}/{file_id}"

            compile_res = subprocess.run(
                ["docker", "exec", "code_runner", "sh", "-c", compile_cmd],
                capture_output=True,
                text=True
            )

            if compile_res.returncode != 0:
                return None, {
                    "type": "CE",
                    "message": compile_res.stderr.strip()
                }, 0

            exec_cmd = f"{container_dir}/{file_id}"

        elif language == "c":
            compile_cmd = f"gcc {container_dir}/{file_name} -o {container_dir}/{file_id}"

            compile_res = subprocess.run(
                ["docker", "exec", "code_runner", "sh", "-c", compile_cmd],
                capture_output=True,
                text=True
            )

            if compile_res.returncode != 0:
                return None, {
                    "type": "CE",
                    "message": compile_res.stderr.strip()
                }, 0

            exec_cmd = f"{container_dir}/{file_id}"

        elif language == "python":
            exec_cmd = f"python3 {container_dir}/{file_name}"

        # RUN 
        result = subprocess.run(
            ["docker", "exec", "-i", "code_runner", "sh", "-c", exec_cmd],
            input=input_data,
            text=True,
            capture_output=True,
            timeout=2
        )

        end_time = time.time()

        if result.returncode != 0:
            return None, {
                "type": "RE",
                "message": result.stderr.strip() or "Runtime Error"
            }, round(end_time - start_time, 4)

        return result.stdout.strip(), None, round(end_time - start_time, 4)

    except subprocess.TimeoutExpired:
        return None, {"type": "TLE", "message": "Time Limit Exceeded"}, 2

    except Exception as e:
        return None, {"type": "RE", "message": str(e)}, 0

    finally:
        # CLEANUP 
        try:
            if os.path.exists(file_path):
                os.remove(file_path)

            subprocess.run(
                ["docker", "exec", "code_runner", "rm", "-rf", container_dir],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except:
            pass