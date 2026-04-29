from app.services.docker_executor import execute_in_docker


# =========================
# ▶️ RUN SINGLE (Practice)
# =========================
def run_single(code: str, input_data: str, language: str = "python"):
    output, error, exec_time = execute_in_docker(code, input_data, language)

    # ⏱ TLE
    if isinstance(error, dict) and error.get("type") == "TLE":
        return {
            "status": "TLE",
            "output": "Time Limit Exceeded",
            "time": exec_time
        }

    # ❌ Runtime Error
    if error:
        return {
            "status": "RE",
            "output": error.get("message", "Error"),
            "time": exec_time
        }

    # ✅ Success
    return {
        "status": "success",
        "output": output,
        "time": exec_time
    }


# =========================
# 🧪 EVALUATE CODE (UPGRADED)
# =========================
def evaluate_code(code, test_cases, language="python"):
    results = []
    passed = 0
    total = len(test_cases)

    try:
        for i, case in enumerate(test_cases):

            input_data = case.get("input", "")
            output, error, exec_time = execute_in_docker(
                code, input_data, language
            )

            expected = case.get("expected_output") or case.get("output")

            # ⏱ TLE
            if isinstance(error, dict) and error.get("type") == "TLE":
                results.append({
                    "test_case": i + 1,
                    "verdict": "TLE",
                    "input": input_data,
                    "expected": expected,
                    "output": "Time Limit Exceeded",
                    "time": exec_time
                })
                return build_final("TLE", results, passed, total, i + 1)

            # ❌ Runtime Error
            if error:
                results.append({
                    "test_case": i + 1,
                    "verdict": "RE",
                    "input": input_data,
                    "expected": expected,
                    "output": error.get("message"),
                    "time": exec_time
                })
                return build_final(
                    "RE",
                    results,
                    passed,
                    total,
                    i + 1,
                    error.get("message")
                )

            if expected is None:
                return build_final(
                    "RE",
                    results,
                    passed,
                    total,
                    i + 1,
                    "Invalid test case format"
                )

            # ✅ Correct Output
            out_normalized = str(output).replace("\r\n", "\n").strip()
            exp_normalized = str(expected).replace("\r\n", "\n").strip()
            if out_normalized == exp_normalized:
                passed += 1
                results.append({
                    "test_case": i + 1,
                    "verdict": "AC",
                    "input": input_data,
                    "expected": expected,
                    "output": output,
                    "time": exec_time
                })

            # ❌ Wrong Answer
            else:
                results.append({
                    "test_case": i + 1,
                    "verdict": "WA",
                    "input": input_data,
                    "expected": expected,
                    "output": output,
                    "time": exec_time
                })

                return build_final("WA", results, passed, total, i + 1)

        # ✅ All passed
        return build_final("AC", results, passed, total)

    except Exception as e:
        return {
            "status": "RE",
            "error": str(e),
            "passed": passed,
            "total": total,
            "details": results
        }


# =========================
# 📊 FINAL BUILDER
# =========================
def build_final(status, details, passed, total, failed_case=None, error_msg=None):
    return {
        "status": status,
        "details": details,
        "passed": passed,
        "total": total,
        "score": int((passed / total) * 100) if total > 0 else 0,
        "failed_case": failed_case,
        "error": error_msg
    }