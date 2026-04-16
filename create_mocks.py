import os
import sys
import subprocess

try:
    import pandas as pd
except ImportError:
    print("Installing pandas and openpyxl...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
    import pandas as pd

mcq_data = [
    {"question_text": "Who is the creator of C?", "topic": "Basics", "difficulty": "easy", "marks": 1, "options": "Dennis Ritchie, Bjarne Stroustrup, James Gosling, Guido van Rossum", "correct_answer": "Dennis Ritchie"},
    {"question_text": "What is the standard extension for a C file?", "topic": "Basics", "difficulty": "easy", "marks": 1, "options": ".c, .cpp, .py, .java", "correct_answer": ".c"},
    {"question_text": "Which symbol is used for a single-line comment in C?", "topic": "Basics", "difficulty": "easy", "marks": 1, "options": "//, /*, #, <!--", "correct_answer": "//"},
    {"question_text": "What is the size of an int data type in a 32-bit system?", "topic": "Data Types", "difficulty": "medium", "marks": 1, "options": "2 bytes, 4 bytes, 8 bytes, 1 byte", "correct_answer": "4 bytes"},
    {"question_text": "Which format specifier is used for integers?", "topic": "Data Types", "difficulty": "easy", "marks": 1, "options": "%d, %f, %c, %s", "correct_answer": "%d"},
    {"question_text": "How do you declare a constant in C?", "topic": "Variables", "difficulty": "medium", "marks": 1, "options": "const int x = 5;, constant int x = 5;, int const x = 5;, Both Option 1 and Option 3", "correct_answer": "Both Option 1 and Option 3"},
    {"question_text": "Which loop is guaranteed to execute at least once?", "topic": "Loops", "difficulty": "medium", "marks": 1, "options": "for, while, do-while, none of the above", "correct_answer": "do-while"},
    {"question_text": "What does the 'break' statement do?", "topic": "Control flow", "difficulty": "easy", "marks": 1, "options": "Exits loop, Skips iteration, Stops program, Nothing", "correct_answer": "Exits loop"},
    {"question_text": "What is the output of 5 / 2 in C?", "topic": "Operators", "difficulty": "medium", "marks": 1, "options": "2.5, 2, 3, Error", "correct_answer": "2"},
    {"question_text": "Which operator is used to get the memory address of a variable?", "topic": "Pointers", "difficulty": "medium", "marks": 1, "options": "*, &, %, #", "correct_answer": "&"},
    {"question_text": "How are arrays indexed in C?", "topic": "Arrays", "difficulty": "easy", "marks": 1, "options": "1-indexed, 0-indexed, -1-indexed, Random", "correct_answer": "0-indexed"},
    {"question_text": "What does malloc() return if it fails?", "topic": "Memory Management", "difficulty": "medium", "marks": 1, "options": "0, NULL, -1, Error", "correct_answer": "NULL"},
    {"question_text": "Which header file is used for printf()?", "topic": "Standard I/O", "difficulty": "easy", "marks": 1, "options": "stdio.h, conio.h, math.h, string.h", "correct_answer": "stdio.h"},
    {"question_text": "What is a pointer in C?", "topic": "Pointers", "difficulty": "hard", "marks": 1, "options": "A variable that stores a value, A variable that stores an address, A keyword, A loop statement", "correct_answer": "A variable that stores an address"},
    {"question_text": "Which keyword is used to return a value from a function?", "topic": "Functions", "difficulty": "easy", "marks": 1, "options": "yield, return, send, output", "correct_answer": "return"},
    {"question_text": "Is C a case-sensitive language?", "topic": "Basics", "difficulty": "easy", "marks": 1, "options": "Yes, No, Sometimes, Machine dependent", "correct_answer": "Yes"},
    {"question_text": "What does the sizeof operator return?", "topic": "Operators", "difficulty": "medium", "marks": 1, "options": "Size in bits, Size in bytes, Depends on OS, None", "correct_answer": "Size in bytes"},
    {"question_text": "Which of the following is not a valid data type in Standard C?", "topic": "Data Types", "difficulty": "medium", "marks": 1, "options": "float, int, Boolean, char", "correct_answer": "Boolean"},
    {"question_text": "What is a structure in C?", "topic": "Structs", "difficulty": "hard", "marks": 1, "options": "A collection of same types, A collection of different data types, A keyword, A built-in function", "correct_answer": "A collection of different data types"},
    {"question_text": "Which function is used to concatenate strings in C?", "topic": "Strings", "difficulty": "medium", "marks": 1, "options": "strcpy(), strlen(), strcat(), strchr()", "correct_answer": "strcat()"}
]

coding_data = [
    {
        "question_text": "Write a program to add two numbers.",
        "topic": "Basics",
        "difficulty": "easy",
        "marks": 5,
        "language": "c",
        "input_format": "Two integers separated by space",
        "output_format": "A single integer denoting the sum",
        "constraints": "-10^4 <= A, B <= 10^4",
        "time_limit": 1.0,
        "memory_limit": 128,
        "starter_code": "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}",
        "sample_input": "3 4",
        "sample_output": "7",
        "hidden_input": "-5 10",
        "hidden_output": "5"
    },
    {
        "question_text": "Write a program to find the factorial of a given number N.",
        "topic": "Loops",
        "difficulty": "medium",
        "marks": 10,
        "language": "c",
        "input_format": "A single integer N",
        "output_format": "A single integer denoting N!",
        "constraints": "0 <= N <= 12",
        "time_limit": 1.0,
        "memory_limit": 256,
        "starter_code": "#include <stdio.h>\n\nint main() {\n    int n;\n    scanf(\"%d\", &n);\n    // Calculate factorial\n    return 0;\n}",
        "sample_input": "5",
        "sample_output": "120",
        "hidden_input": "6",
        "hidden_output": "720"
    },
    {
        "question_text": "Write a recursive function to compute the N-th Fibonacci number. Assume Fibonacci(1) = 1, Fibonacci(2) = 1.",
        "topic": "Recursion",
        "difficulty": "hard",
        "marks": 15,
        "language": "c",
        "input_format": "A single integer N",
        "output_format": "A single integer denoting the N-th Fibonacci number",
        "constraints": "1 <= N <= 30",
        "time_limit": 2.0,
        "memory_limit": 256,
        "starter_code": "#include <stdio.h>\n\nint fibonacci(int n) {\n    // Implement recursion\n}\n\nint main() {\n    int n;\n    scanf(\"%d\", &n);\n    printf(\"%d\", fibonacci(n));\n    return 0;\n}",
        "sample_input": "5",
        "sample_output": "5",
        "hidden_input": "10",
        "hidden_output": "55"
    }
]

mcq_df = pd.DataFrame(mcq_data)
coding_df = pd.DataFrame(coding_data)

mcq_path = os.path.join(r"c:\Projects\Evalis", "mock_c_mcq_advanced.xlsx")
coding_path = os.path.join(r"c:\Projects\Evalis", "mock_c_coding_advanced.xlsx")

mcq_df.to_excel(mcq_path, index=False)
coding_df.to_excel(coding_path, index=False)

print(f"Created: {mcq_path}")
print(f"Created: {coding_path}")
