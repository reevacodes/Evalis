# from app.services.docker_executor import execute_in_docker


# def run_single(code: str, input_data: str, language: str = "python"):
#     output, error, exec_time = execute_in_docker(code, input_data, language)

#     if isinstance(error, dict) and error.get("type") == "TLE":
#         return {
#             "status": "TLE",
#             "output": "Time Limit Exceeded",
#             "time": exec_time
#         }

#     if error:
#         return {
#             "status": "RE",
#             "output": error.get("message"),
#             "time": exec_time
#         }

#     return {
#         "status": "success",
#         "output": output,
#         "time": exec_time
#     }


# def evaluate_code(code, test_cases, language="python"):
#     results = []
#     passed = 0
#     total = len(test_cases)

#     for i, case in enumerate(test_cases):
#         output, error, exec_time = execute_in_docker(
#             code, case["input"], language
#         )

#         if isinstance(error, dict) and error.get("type") == "TLE":
#             return build_final("TLE", results, passed, total, i + 1)

#         if error:
#             return build_final("RE", results, passed, total, i + 1, error.get("message"))

#         if output.strip() == case["output"].strip():
#             passed += 1
#             results.append({
#                 "test_case": i + 1,
#                 "verdict": "AC",
#                 "time": exec_time
#             })
#         else:
#             return build_final("WA", results, passed, total, i + 1)

#     return build_final("AC", results, passed, total)


# def build_final(status, details, passed, total, failed_case=None, error_msg=None):
#     return {
#         "status": status,
#         "details": details,
#         "passed": passed,
#         "total": total,
#         "score": int((passed / total) * 100) if total > 0 else 0,
#         "failed_case": failed_case,
#         "error": error_msg
#     }