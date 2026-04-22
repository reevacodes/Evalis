import pandas as pd

# --- MCQ DATA ---
mcqs = []
topics = ["Ch 3: Arrays & Strings", "Ch 4: Functions & Recursion", "Ch 5: Pointers & Memory"]

# 20 MCQs distributed across chapters
for i in range(1, 21):
    topic_idx = (i - 1) % 3
    mcqs.append({
        "question_text": f"Sample MCQ Question {i} on {topics[topic_idx]}",
        "options": "Option A, Option B, Option C, Option D",
        "correct_answer": "Option A",
        "topic": topics[topic_idx],
        "marks": 1,
        "difficulty": "medium",
        "tags": "cs, midterms"
    })

df_mcq = pd.DataFrame(mcqs)
df_mcq.to_excel("../MCQ_Questions_Import.xlsx", index=False)

# --- CODING DATA ---
coding = []
# 3 coding questions
coding_prompts = [
    ("Reverse an Array", "Write a C program to reverse an array of N integers in place."),
    ("Recursive Fibonacci", "Write a recursive C function to compute the Nth Fibonacci number."),
    ("Pointer Swap", "Write a C function that swaps the values of two variables using pointers.")
]

for i in range(3):
    topic_idx = i
    title, prompt = coding_prompts[i]
    coding.append({
        "question_text": prompt,
        "topic": topics[topic_idx],
        "marks": 5,
        "difficulty": "hard" if i == 2 else "medium",
        "tags": "cs, coding",
        "language": "c",
        "input_format": "Single integer or array",
        "output_format": "Expected output format",
        "constraints": "Time limit 2s",
        "time_limit": 2.0,
        "memory_limit": 256,
        "sample_input": "1",
        "sample_output": "1",
        "hidden_input": "5",
        "hidden_output": "120" if i == 1 else "5",
        "starter_code": "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}"
    })

df_coding = pd.DataFrame(coding)
df_coding.to_excel("../Coding_Questions_Import.xlsx", index=False)

print("✅ Excel files generated successfully in Evalis root folder!")
