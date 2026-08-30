import requests
import json

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
stream = False

headers = {
    "Authorization": "Bearer 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",
    "Accept": "text/event-stream" if stream else "application/json",
}

payload = {
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "moonshotai/kimi-k3",
  "max_tokens": 1024,
  "seed": 0,
  "stream": stream,
  "temperature": 1,
}

print("Sending request...")
response = requests.post(invoke_url, headers=headers, json=payload, stream=stream, timeout=10)
print(response.status_code)
print(response.json())
