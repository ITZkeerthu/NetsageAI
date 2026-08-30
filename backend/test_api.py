import requests

print("Testing NetSage API...")
try:
    response = requests.get("http://localhost:8000/")
    print(response.json())
except Exception as e:
    print("API not running or error:", e)
