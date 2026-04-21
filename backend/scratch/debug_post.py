import urllib.request
import json

req = urllib.request.Request('http://127.0.0.1:8000/api/past-papers')
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        if len(data) > 0:
            paper_id = data[0]['_id']
            print("Found paper:", paper_id)
            
            # Now POST attempt
            req2 = urllib.request.Request(
                f'http://127.0.0.1:8000/api/past-papers/{paper_id}/practice-attempts',
                data=json.dumps({"mcq_answers": {}, "coding_answers": {}}).encode(),
                headers={'Content-Type': 'application/json'}
            )
            # Need a token to hit practice-attempts? Yes, user=Depends(require_role("student"))
            print("Needs token to proceed.")
        else:
            print("No papers")
except Exception as e:
    print("Error:", e)
