import os
import json
import uuid
import google.generativeai as genai
import fitz  # PyMuPDF
import numpy as np

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts all text from a PDF file."""
    text = ""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text() + "\n"
    except Exception as e:
        print(f"Failed to extract PDF text: {e}")
    return text

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list:
    """Splits text into chunks of specified size with overlap."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def get_embeddings(texts: list) -> list:
    """Gets embeddings for a list of text strings using Gemini Embedding Model."""
    embeddings = []
    try:
        for t in texts:
            result = genai.embed_content(
                model="models/gemini-embedding-001",
                content=t,
                task_type="retrieval_document"
            )
            embeddings.append(result['embedding'])
    except Exception as e:
        print(f"Failed to generate embeddings: {e}")
    return embeddings

def get_query_embedding(query: str) -> list:
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=query,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as e:
        print(f"Failed to generate query embedding: {e}")
        return []

def cosine_similarity(v1, v2):
    """Calculates cosine similarity between two vectors."""
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0
    return dot_product / (norm_v1 * norm_v2)

def retrieve_top_chunks(query: str, chunks: list, embeddings: list, top_k: int = 4) -> str:
    """Retrieves the top_k most relevant chunks for a given query."""
    if not embeddings:
        return ""
    
    query_emb = get_query_embedding(query)
    if not query_emb:
        return " ".join(chunks[:top_k])
        
    similarities = [cosine_similarity(query_emb, doc_emb) for doc_emb in embeddings]
    
    # Get top k indices
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    
    context = "\n\n---\n\n".join([chunks[i] for i in top_indices])
    return context

def generate_rag_questions(subject_name: str, subject_code: str, unit: str, context: str, mcq_count: int = 5, coding_count: int = 1) -> list:
    """Generates strictly formatted questions grounded ONLY in the provided RAG context."""
    if not GEMINI_API_KEY:
        return []
        
    model = genai.GenerativeModel('gemini-2.5-flash-lite', generation_config={"response_mime_type": "application/json"})
    
    prompt = f"""
    You are an expert Computer Science professor. Generate practice questions for a university exam based EXCLUSIVELY on the provided lecture context.
    Do NOT use outside knowledge. Focus EXCLUSIVELY on the concepts, terms, and code examples present in the provided LECTURE CONTEXT, even if they do not match the typical syllabus of the specified Subject or Chapter/Unit Number. The provided context takes absolute precedence.

    Subject: {subject_name} ({subject_code})
    Chapter/Unit Number: {unit}

    --- LECTURE CONTEXT START ---
    {context}
    --- LECTURE CONTEXT END ---

    I need EXACTLY {mcq_count} Multiple Choice Questions (MCQs) and EXACTLY {coding_count} Coding questions.
    
    CRITICAL INSTRUCTIONS FOR THE CODING QUESTION:
    1. Python Code Execution Model: The coding question will be evaluated by executing student code inside a sandbox. The sandbox feeds input data to standard input (stdin) and captures standard output (stdout).
    2. Input Format Clarity: Do NOT use vague input formats like "A list of integers". You must specify exactly how the input is formatted for stdin reading. For example:
       - "First line contains N, the number of elements. The second line contains N space-separated integers."
       - OR "A single line containing space-separated integers."
    3. Output Format Clarity: You must specify exactly what needs to be printed to stdout. For example:
       - "Print a single integer representing the sum."
       - "Print the unique elements as space-separated integers in a single line."
    4. Starter Code Boilerplate: The starter code should show the student how to read input from stdin and print the output. Do NOT just provide a function with pass. Instead, provide a boilerplate like:
       ```python
       import sys

       def solution():
           # Read input from stdin
           # input_data = sys.stdin.read().split()
           # Write your logic here
           # Print the result to stdout
           pass

       if __name__ == '__main__':
           solution()
       ```
    5. Test Cases: Provide a list of at least 3 test cases. The first test case must be the sample test case matching the explanation in question_text. The other test cases are hidden test cases for evaluation. Each test case must have "input" and "expected_output" (both as strings).

    Output ONLY valid JSON matching this schema:
    {{
      "questions": [
        {{
          "type": "mcq",
          "question_text": "string (Grounded in context)",
          "options": ["string", "string", "string", "string"],
          "correct_answer": "string (must exactly match one of the options)",
          "topic": "string (derived from context)",
          "marks": 1,
          "difficulty": "medium"
        }},
        {{
          "type": "coding",
          "question_text": "string (clear problem statement based on context. Describe the problem, and provide Example 1 and Example 2 with Input and Output explanations)",
          "topic": "string",
          "marks": 10,
          "difficulty": "medium",
          "language": "python",
          "input_format": "string (explicit explanation of stdin structure)",
          "output_format": "string (explicit explanation of stdout structure)",
          "constraints": "string (numeric boundaries e.g. 1 <= N <= 1000)",
          "time_limit": 2.0,
          "memory_limit": 256,
          "test_cases": [
            {{
              "input": "string (exact input fed to stdin)",
              "expected_output": "string (exact output printed to stdout)"
            }}
          ],
          "starter_code": "string (boilerplate code with stdin reading and stdout writing)"
        }}
      ]
    }}

    ONE-SHOT CODING QUESTION EXAMPLE (Use this structure style):
    {{
      "type": "coding",
      "question_text": "Write a Python program that takes a list of integers, removes duplicates while maintaining the original order of appearance, and prints the unique integers.\\n\\nExample 1:\\nInput:\\n5\\n1 2 2 3 1\\nOutput:\\n1 2 3\\n\\nExample 2:\\nInput:\\n3\\n9 9 9\\nOutput:\\n9",
      "topic": "Lists and Sets",
      "marks": 10,
      "difficulty": "medium",
      "language": "python",
      "input_format": "The first line contains an integer N, the number of elements in the list.\\nThe second line contains N space-separated integers representing the list elements.",
      "output_format": "Print the unique elements of the list, separated by spaces, on a single line.",
      "constraints": "1 <= N <= 10^5\\n-10^9 <= element <= 10^9",
      "time_limit": 2.0,
      "memory_limit": 256,
      "test_cases": [
        {{"input": "5\\n1 2 2 3 1\\n", "expected_output": "1 2 3\\n"}},
        {{"input": "3\\n9 9 9\\n", "expected_output": "9\\n"}},
        {{"input": "6\\n-1 0 -1 5 0 2\\n", "expected_output": "-1 0 5 2\\n"}}
      ],
      "starter_code": "import sys\\n\\ndef solution():\\n    # Read all inputs from standard input\\n    input_data = sys.stdin.read().split()\\n    if not input_data:\\n        return\\n    n = int(input_data[0])\\n    elements = [int(x) for x in input_data[1:n+1]]\\n    \\n    # Write your logic here\\n    # e.g., result = ...\\n    \\n    # Print output to stdout\\n    # print(\" \".join(map(str, result)))\\n    pass\\n\\nif __name__ == '__main__':\\n    solution()"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
            
        data = json.loads(text.strip())
        questions = data.get("questions", [])
        
        # Attach required metadata and perform defensive test case restructuring
        for q in questions:
            q["_id"] = str(uuid.uuid4())
            q["subject_code"] = subject_code
            q["subject_name"] = subject_name
            q["unit"] = str(unit)
            
            # Align test cases format with database expectations
            if q.get("type") == "coding":
                # Ensure a test_cases list is present
                test_cases = q.get("test_cases")
                if not test_cases or not isinstance(test_cases, list):
                    test_cases = []
                    # Try reconstructing from legacy fields if generated by the LLM
                    s_in = q.get("sample_input") or q.pop("sample_input", None)
                    s_out = q.get("sample_output") or q.pop("sample_output", None)
                    h_in = q.get("hidden_input") or q.pop("hidden_input", None)
                    h_out = q.get("hidden_output") or q.pop("hidden_output", None)
                    
                    if s_in is not None or s_out is not None:
                        test_cases.append({"input": str(s_in or ""), "expected_output": str(s_out or "")})
                    if h_in is not None or h_out is not None:
                        test_cases.append({"input": str(h_in or ""), "expected_output": str(h_out or "")})
                        
                    q["test_cases"] = test_cases
                else:
                    # Clean up each test case dictionary to make sure it has 'expected_output'
                    cleaned_cases = []
                    for tc in test_cases:
                        if isinstance(tc, dict):
                            inp = tc.get("input", "")
                            out = tc.get("expected_output") or tc.get("output") or ""
                            cleaned_cases.append({"input": str(inp), "expected_output": str(out)})
                    q["test_cases"] = cleaned_cases
            
        return questions
    except Exception as e:
        print(f"❌ Failed to generate RAG JSON: {e}")
        return []
    except Exception as e:
        print(f"❌ Failed to generate RAG JSON: {e}")
        return []
