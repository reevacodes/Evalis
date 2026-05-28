import pandas as pd

coding = [
    {
        "question_text": "Find the largest of three numbers.\n\nProblem Description:\nFind the largest of three numbers.",
        "topic": "Decision Making and Branching",
        "marks": 5,
        "difficulty": "medium",
        "tags": "if-else",
        "language": "c",
        "input_format": "Three integers (separated by space)",
        "output_format": "Print the largest number",
        "constraints": "-10^5 <= a,b,c <= 10^5",
        "time_limit": 2.0,
        "memory_limit": 256,
        "sample_input": "12 45 7",
        "sample_output": "45",
        "hidden_input": "99 -12 104",
        "hidden_output": "104",
        "starter_code": "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}"
    },
    {
        "question_text": "Write a function to check whether a number is prime.\n\nProblem Description:\nWrite a function to check whether a number is prime.",
        "topic": "User Defined Functions",
        "marks": 5,
        "difficulty": "medium",
        "tags": "functions, prime",
        "language": "c",
        "input_format": "An integer n",
        "output_format": "Print 'Prime' or 'Not Prime'",
        "constraints": "1 <= n <= 10000",
        "time_limit": 2.0,
        "memory_limit": 256,
        "sample_input": "7",
        "sample_output": "Prime",
        "hidden_input": "12",
        "hidden_output": "Not Prime",
        "starter_code": "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}"
    },
    {
        "question_text": "Write a program to write data into a file and read it back.\n\nProblem Description:\nWrite a program to write data into a file and read it back.",
        "topic": "File Handling in C",
        "marks": 5,
        "difficulty": "medium",
        "tags": "file",
        "language": "c",
        "input_format": "A string",
        "output_format": "Print the string read from file",
        "constraints": "Length <= 100",
        "time_limit": 2.0,
        "memory_limit": 256,
        "sample_input": "Hello_Evalis",
        "sample_output": "Hello_Evalis",
        "hidden_input": "Awesome_Demo",
        "hidden_output": "Awesome_Demo",
        "starter_code": "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}"
    }
]

# Generate Excel in Evalis root folder
df_coding = pd.DataFrame(coding)
output_path = "../Demo_Questions_Import.xlsx"
df_coding.to_excel(output_path, index=False)

print(f"SUCCESS: Excel sheet generated successfully at: {output_path}!")
