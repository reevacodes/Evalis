import sys
sys.path.append('.')
from app.utils.security import create_access_token
import urllib.request
import json

token = create_access_token({'sub': '2022a1r144@mietjammu.in', 'email': '2022a1r144@mietjammu.in', 'role': 'student'})
req = urllib.request.Request('http://localhost:8000/exam', headers={'Authorization': 'Bearer ' + token})
try:
    res = urllib.request.urlopen(req)
    print("CODE:", res.getcode())
    print("DATA LENGTH:", len(res.read()))
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print(e.read())
