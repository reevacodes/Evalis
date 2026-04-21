import re
import json

def parse():
    with open('raw_mst_mcq_4.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    mcqs = []
    
    current_topic = "Unit 4"
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
            
        um = unit_pattern.match(line)
        if um:
            current_topic = um.group(1).strip()
            continue
            
        qm = q_pattern.match(line)
        if qm:
            if current_q and current_q.get('correct_answer'):
                mcqs.append(current_q)
            current_q = {
                "id": f"q{len(mcqs)+1}",
                "question": qm.group(1).strip(),
                "options": [],
                "correct_answer": None,
                "topic": current_topic,
                "type": "mcq"
            }
            continue
            
        om = opt_pattern.match(line)
        if om and current_q is not None:
            current_q["options"].append(om.group(2).strip())
            if "option_map" not in current_q:
                current_q["option_map"] = {}
            current_q["option_map"][om.group(1)] = om.group(2).strip()
            continue
            
        am = ans_pattern.match(line)
        if am and current_q is not None:
            ans_letter = am.group(1)
            current_q["correct_answer"] = current_q["option_map"].get(ans_letter, "")
            del current_q["option_map"]
            
    if current_q and current_q.get('correct_answer'):
        if "option_map" in current_q:
            del current_q["option_map"]
        mcqs.append(current_q)
        
    print(f"Parsed {len(mcqs)} MCQs.")

    payload = []
    
    if len(mcqs) > 0:
        payload.append({
            "type": "mcq",
            "count": len(mcqs),
            "marks_per_question": 1,
            "questions": mcqs
        })
        
    with open('mst_mcq_4_payload_pretty.json', 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)
        
if __name__ == "__main__":
    parse()
