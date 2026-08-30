import os
import json
from openai import OpenAI

NVIDIA_API_KEY = "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"
BASE_URL = "https://integrate.api.nvidia.com/v1"
MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"

client = OpenAI(
  base_url=BASE_URL,
  api_key=NVIDIA_API_KEY
)

def generate_diagnosis(prompt: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": "You are NetSage, a network troubleshooting assistant. Return structured JSON with the following keys: root_cause, osi_layer, confidence, explanation, next_command, suggested_fix."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
            top_p=0.95,
            max_tokens=4096,
            extra_body={"chat_template_kwargs":{"enable_thinking":True},"reasoning_budget":16384},
            stream=True
        )
        
        content = ""
        for chunk in completion:
            if not chunk.choices:
                continue
            if chunk.choices[0].delta.content is not None:
                content += chunk.choices[0].delta.content
                
        # Try to parse the assembled content as JSON
        try:
            if content.startswith("```json"):
                content = content.replace("```json\n", "").replace("```", "").strip()
            elif content.startswith("```"):
                content = content.replace("```\n", "").replace("```", "").strip()
            parsed_json = json.loads(content)
            return parsed_json
        except json.JSONDecodeError:
            return {"error": "Failed to parse LLM response as JSON", "raw_response": content}
            
    except Exception as e:
        return {"error": str(e)}

def generate_search_queries(symptom: str) -> list:
    """
    Uses the LLM as an agent to determine the best search queries to run on DuckDuckGo
    to find evidence/documentation for the student's problem.
    """
    prompt = f"The student is facing this network issue: '{symptom}'. Generate 2 optimized search queries to find Cisco documentation or Packet Tracer bug reports. Return a JSON array of strings."
    
    messages = [
        {
            "role": "system",
            "content": "You are a web search agent. Output ONLY a valid JSON array of strings representing search queries. Do not include markdown formatting or explanations."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=1024,
            stream=False # Stream false for simple JSON array
        )
        
        content = completion.choices[0].message.content
        if content.startswith("```json"):
            content = content.replace("```json\n", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```\n", "").replace("```", "").strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Error generating queries: {e}")
        return [symptom] # Fallback to the raw symptom

if __name__ == "__main__":
    # Simple test
    test_prompt = "The PC can ping its gateway 192.168.10.1, but cannot reach the server at 10.0.0.5. The routing table shows no route to 10.0.0.0/8."
    print("Testing LLM generation with nemotron-3.5-lightning...")
    # print(json.dumps(generate_diagnosis(test_prompt), indent=2))
    print("Testing Search Agent:")
    print(generate_search_queries("OSPF neighbor stuck in EXSTART in Packet Tracer"))

def generate_chat_reply(history: list, new_message: str, case_context: str, is_resolved: bool = False) -> str:
    """
    history: list of dicts [{"role": "user"/"assistant", "content": "..."}]
    """
    if is_resolved:
        system_instruction = "Respond to the user's latest message clearly and concisely. Acknowledge that the issue is now resolved, and do NOT ask if the issue is fixed or not."
    else:
        system_instruction = "Respond to the user's latest message clearly and concisely. By the end of your response, you MUST ask if the issue is fixed or not."

    messages = [
        {
            "role": "system",
            "content": f"You are NetSage, a network troubleshooting assistant helping a user with a specific case.\nCase Context:\n{case_context}\n\n{system_instruction}"
        }
    ]
    messages.extend(history)
    messages.append({"role": "user", "content": new_message})

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.3,
            top_p=0.95,
            max_tokens=4096,
            extra_body={"chat_template_kwargs":{"enable_thinking":True},"reasoning_budget":8192},
            stream=True
        )
        
        content = ""
        for chunk in completion:
            if not chunk.choices:
                continue
            if chunk.choices[0].delta.content is not None:
                content += chunk.choices[0].delta.content
                
        return content.strip()
    except Exception as e:
        return f"Error connecting to LLM: {str(e)}"
