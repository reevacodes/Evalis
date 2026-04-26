import requests

url = "http://localhost:8000/auth/login"
data = {
    "email": "2022a1r159@gmail.com",
    "password": "Password@123" # assuming something like this, or maybe it fails with 401
}
try:
    res = requests.post(url, json=data)
    print(res.status_code)
    print(res.json())
except Exception as e:
    print(e)
