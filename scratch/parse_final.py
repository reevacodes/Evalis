import re
import json

def parse():
    with open('raw_final.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    mcqs = []
    coding = []
    
    # Split text into lines
    parts = text.split('{')
    # The first part is the MCQ text. The next parts are coding JSON blocks starting from '{'
    
    # Process MCQ part
    mcq_text = parts[0]
    
    current_topic = "Unit 3: Control Flow"
    lines = mcq_text.strip().split('\n')
    
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
    
    # Process Coding part
    idx = text.find('{')
    if idx != -1:
        coding_text = text[idx:]
        
        # we have multiple adjacent JSON objects: {...} \n {...} \n {...}
        # A simple hack is to wrap it in a list [ ... ] and comma separate.
        # But wait, there might be spaces between objects.
        coding_text = coding_text.replace('}\n{', '},{').replace('}\r\n{', '},{').replace('} {', '},{')
        try:
            # Maybe there are spaces like "} \n {" or similar. Regex to the rescue.
            coding_text = re.sub(r'\}\s*\{', '},{', coding_text)
            coding_json = json.loads(f'[{coding_text}]')
            
            for item in coding_json:
                item['type'] = 'coding'
                coding.append(item)
            print(f"Parsed {len(coding)} Coding questions.")
            
        except Exception as e:
            print("Error parsing json blocks:", e)

    payload = []
    
    if len(mcqs) > 0:
        payload.append({
            "type": "mcq",
            "count": len(mcqs),
            "marks_per_question": 1,
            "questions": mcqs
        })
        
    if len(coding) > 0:
        payload.append({
            "type": "coding",
            "count": len(coding),
            "marks_per_question": 10,
            "questions": coding
        })
        
    with open('final_payload.json', 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)
        
if __name__ == "__main__":
    parse()
