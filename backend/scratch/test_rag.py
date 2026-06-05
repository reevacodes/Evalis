import os
import sys
import json
import uuid
from dotenv import load_dotenv
import google.generativeai as genai
import numpy as np

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def get_embeddings(texts: list) -> list:
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
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0
    return dot_product / (norm_v1 * norm_v2)

def retrieve_top_chunks(query: str, chunks: list, embeddings: list, top_k: int = 4) -> str:
    if not embeddings:
        return ""
    
    query_emb = get_query_embedding(query)
    if not query_emb:
        return " ".join(chunks[:top_k])
        
    similarities = [cosine_similarity(query_emb, doc_emb) for doc_emb in embeddings]
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    
    context = "\n\n---\n\n".join([chunks[i] for i in top_indices])
    return context

def generate_rag_questions(subject_name: str, subject_code: str, unit: str, context: str, mcq_count: int = 5, coding_count: int = 1) -> list:
    if not GEMINI_API_KEY:
        print("No GEMINI_API_KEY found")
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
        
        for q in questions:
            q["_id"] = str(uuid.uuid4())
            q["subject_code"] = subject_code
            q["subject_name"] = subject_name
            q["unit"] = str(unit)
            
        return questions
    except Exception as e:
        print(f"❌ Failed to generate RAG JSON: {e}")
        return []

text = """Polymorphism in C++
1. Introduction to Polymorphism
Polymorphism is one of the fundamental concepts of Object-Oriented Programming (OOP). The word polymorphism
is derived from two Greek words: “poly” meaning many and “morph” meaning forms. Therefore, polymorphism means
“many forms.” In programming, polymorphism allows a single function, method, or operator to behave differently
depending on the object or context. It improves flexibility, code reusability, scalability, and maintainability in software
systems. For example, a function named display() may behave differently for integers, floating-point values, or strings.
Similarly, an operator such as + can perform addition for numbers and concatenation for strings. Polymorphism mainly
exists in two forms: 1. Compile-Time Polymorphism 2. Run-Time Polymorphism Compile-time polymorphism is
achieved using function overloading and operator overloading, while run-time polymorphism is achieved using
inheritance and virtual functions.
2. Types of Polymorphism
Compile-Time Polymorphism is also known as static binding or early binding because the compiler determines the
function call during compilation. Examples include: • Function Overloading • Operator Overloading Run-Time
Polymorphism is also known as dynamic binding or late binding because the function call is resolved during program
execution. It is mainly achieved through: • Function Overriding • Virtual Functions
3. Function Overloading
Function overloading allows multiple functions with the same name but different parameters. The compiler
differentiates the functions based on the number, type, or order of arguments.
#include <iostream>
using namespace std;
class Calculator
{
public:
int add(int a, int b)
{
return a + b;
}
double add(double a, double b)
{
return a + b;
}
};
int main()
{
Calculator c;
cout << c.add(5, 3) << endl;
cout << c.add(5.5, 2.3) << endl;
return 0;
}
4. Operator Overloading
Operator overloading allows operators to have multiple meanings depending on the objects used. For example, the +
operator can add numbers or combine objects. This improves readability and allows custom classes to behave
similarly to built-in data types.
#include <iostream>
using namespace std;
class Complex
{
public:
int real, imag;
Complex(int r, int i)
{
real = r;
imag = i;
}
Complex operator + (Complex obj)
{
return Complex(real + obj.real, imag + obj.imag);
}
void display()
{
cout << real << " + " << imag << "i" << endl;
}
};
int main()
{
Complex c1(2, 3);
Complex c2(4, 5);
Complex c3 = c1 + c2;
c3.display();
return 0;
}
5. Run-Time Polymorphism
Run-time polymorphism occurs when a derived class redefines a function of the base class. This is known as function
overriding. Virtual functions are used to achieve dynamic binding. When a base class pointer points to a derived class
object, the overridden function in the derived class is executed.
#include <iostream>
using namespace std;
class Animal
{
public:
virtual void sound()
{
cout << "Animal makes a sound" << endl;
}
};
class Dog : public Animal
{
public:
void sound()
{
cout << "Dog barks" << endl;
}
};
int main()
{
Animal* a;
Dog d;
a = &d;
a->sound();
return 0;
}
6. Custom Scenario — Adaptive Morphic Control System
Consider a fictional AI-driven robotics platform called the Adaptive Morphic Control System. This system controls
multiple robot units such as drones, wheeled robots, and robotic arms. Each robot responds differently to the same
command executeTask(). This demonstrates run-time polymorphism because the same function call behaves
differently depending on the object type. The system uses base-class pointers to interact with different robot classes
dynamically. This design improves scalability because new robot types can be added without modifying existing
control logic.
#include <iostream>
using namespace std;
class Robot
{
public:
virtual void executeTask()
{
cout << "Robot executing generic task" << endl;
}
};
class Drone : public Robot
{
public:
void executeTask()
{
cout << "Drone performing aerial scan" << endl;
}
};
class ArmRobot : public Robot
{
public:
void executeTask()
{
cout << "Arm Robot assembling components" << endl;
}
};
void activateRobot(Robot* r)
{
r->executeTask();
}
int main()
{
Drone d;
ArmRobot a;
activateRobot(&d);
activateRobot(&a);
return 0;
}
Conclusion
Polymorphism is a powerful feature of object-oriented programming that allows flexibility and dynamic behavior in
software applications. It enables programmers to write generic, reusable, and scalable code. Compile-time
polymorphism improves efficiency through function and operator overloading, while run-time polymorphism enables
dynamic behavior using inheritance and virtual functions. Polymorphism is widely used in modern software systems
such as GUI frameworks, game engines, robotics, operating systems, and AI-driven applications."""

chunks = chunk_text(text)
print(f"Generated {len(chunks)} chunks.")

embeddings = get_embeddings(chunks)
print(f"Generated {len(embeddings)} embeddings.")

query = "Key concepts, definitions, and code examples for Python Programming-I (COM-501) Chapter 3"
context = retrieve_top_chunks(query, chunks, embeddings, top_k=5)
print(f"Retrieved context size: {len(context)}")

questions = generate_rag_questions("Python Programming-I", "COM-501", "3", context, mcq_count=5, coding_count=1)
print(f"Generated {len(questions)} questions:")
print(json.dumps(questions, indent=2))
