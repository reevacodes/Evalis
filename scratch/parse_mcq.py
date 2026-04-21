import re
import json

def parse():
    with open('raw_mcq.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    questions = []
    # Using regex to find question blocks. 
    # Example format:
    # 1. Which generation of languages is machine language?
    # A) 1st
    # B) 2nd
    # C) 3rd
    # D) 4th
    # 👉 Ans: A
    
    current_topic = "General Programming"
    
    # Split text into lines
    lines = text.strip().split('\n')
    
    q_pattern = re.compile(r'^\d+\.\s+(.*)')
    opt_pattern = re.compile(r'^([A-D])\)\s+(.*)')
    ans_pattern = re.compile(r'^👉\s+Ans:\s+([A-D])')
    unit_pattern = re.compile(r'^🔹\s+(.*)')
    
    current_q = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # check for unit
        um = unit_pattern.match(line)
        if um:
            current_topic = um.group(1).strip()
            continue
            
        qm = q_pattern.match(line)
        if qm:
            if current_q and current_q.get('correct_answer'):
                questions.append(current_q)
            current_q = {
                "id": f"q{len(questions)+1}",
                "question": qm.group(1).strip(),
                "options": [],
                "correct_answer": None,
                "topic": current_topic,
                "type": "mcq"
            }
            continue
            
        om = opt_pattern.match(line)
        if om and current_q is not None:
            # e.g., '1st'
            current_q["options"].append(om.group(2).strip())
            # record the mapping
            if "option_map" not in current_q:
                current_q["option_map"] = {}
            current_q["option_map"][om.group(1)] = om.group(2).strip()
            continue
            
        am = ans_pattern.match(line)
        if am and current_q is not None:
            ans_letter = am.group(1)
            # map the letter to the actual option text
            current_q["correct_answer"] = current_q["option_map"].get(ans_letter, "")
            # cleanup option_map
            del current_q["option_map"]
            
    if current_q and current_q.get('correct_answer'):
        if "option_map" in current_q:
            del current_q["option_map"]
        questions.append(current_q)

    # Format into sections array
    payload = [
        {
            "type": "mcq",
            "count": len(questions),
            "marks_per_question": 1,
            "questions": questions
        }
    ]
    
    with open('parsed_payload.json', 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)

if __name__ == "__main__":
    parse()
