import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"

headers = {
    "Authorization": "Bearer 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",
    "Accept": "application/json",
}

payload = {
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "model": "moonshotai/kimi-k3",
  "max_tokens": 100,
  "temperature": 0.5,
}

print("Testing NVIDIA API authentication...")
try:
    response = requests.post(invoke_url, headers=headers, json=payload, timeout=15)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! API key works.")
        print(response.json()["choices"][0]["message"]["content"])
    else:
        print("Failed!")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
