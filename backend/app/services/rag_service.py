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
          "question_text": "string (clear problem statement based on context)",
          "topic": "string",
          "marks": 10,
          "difficulty": "medium",
          "language": "python",
          "input_format": "string",
          "output_format": "string",
          "constraints": "string",
          "time_limit": 2.0,
          "memory_limit": 256,
          "sample_input": "string",
          "sample_output": "string",
          "hidden_input": "string",
          "hidden_output": "string",
          "starter_code": "def solution():\\n    pass"
        }}
      ]
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
        
        # Attach required metadata
        for q in questions:
            q["_id"] = str(uuid.uuid4())
            q["subject_code"] = subject_code
            q["subject_name"] = subject_name
            q["unit"] = str(unit)
            
        return questions
    except Exception as e:
        print(f"❌ Failed to generate RAG JSON: {e}")
        return []
