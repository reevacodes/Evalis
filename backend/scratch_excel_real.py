import pandas as pd
import random

# --- EXACT DB TOPICS ---
ch3_topics = [
    "Decision Making and Branching", "Looping Constructs", "Storage Classes in C", 
    "Scope Rules", "Standard Library Functions Overview", "String Functions", 
    "Character Functions", "Mathematical Functions", "Time and Date Functions"
]

ch4_topics = [
    "User Defined Functions", "Function Categories and Prototypes", "Parameter Passing Techniques", 
    "Call by Value vs Call by Reference", "Recursion and Nested Functions", "One Dimensional Arrays", 
    "Multidimensional Arrays", "Passing Arrays to Functions", "String Handling in C", 
    "Structures and Unions", "Pointers to Structures and Unions"
]

ch5_topics = [
    "Pointer Basics and Importance", "Pointer Arithmetic", "Pointer to Pointer", 
    "Pointer to Functions", "Dangling Pointer", "Dynamic Memory Allocation", 
    "malloc, calloc, realloc, free", "Console Input Output Functions", 
    "File Handling in C", "File Operations (open, close, read, write)"
]

all_topics = ch3_topics + ch4_topics + ch5_topics

# --- MCQ DATA ---
mcqs = []
for i in range(1, 21):
    # Pick a random topic from the entire list
    topic = random.choice(all_topics)
    mcqs.append({
        "question_text": f"Sample MCQ Question {i} on {topic}",
        "options": "Option A, Option B, Option C, Option D",
        "correct_answer": "Option A",
        "topic": topic,
        "marks": 1,
        "difficulty": random.choice(["easy", "medium", "hard"]),
        "tags": "cs, midterms"
    })

df_mcq = pd.DataFrame(mcqs)
df_mcq.to_excel("../MCQ_Questions_Import.xlsx", index=False)

# --- CODING DATA ---
coding = []
coding_prompts = [
    ("Recursion Logic", "Write a recursive C function for this problem.", random.choice(ch4_topics)),
    ("Array Traversal", "Write a C program to traverse and modify the array.", random.choice(ch3_topics)),
    ("Pointer Manipulation", "Write a C function that uses pointers to solve the memory allocation issue.", random.choice(ch5_topics))
]

for i, (title, prompt, topic) in enumerate(coding_prompts):
    coding.append({
        "question_text": prompt,
        "topic": topic,
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
        "hidden_output": "120" if i == 0 else "5",
        "starter_code": "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}"
    })

df_coding = pd.DataFrame(coding)
df_coding.to_excel("../Coding_Questions_Import.xlsx", index=False)

print("Files successfully generated!")
