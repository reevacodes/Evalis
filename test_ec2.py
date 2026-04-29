import requests
res = requests.post('http://3.104.35.42:8000/execute', json={'code':'#include <stdio.h>\nint main() { printf("Hello C"); return 0; }', 'language':'c', 'input_data':''}, headers={'X-API-Key':'your_super_secret_execution_key_here'})
print(res.status_code, res.text)
