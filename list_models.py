import os
from google import genai

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('GOOGLE_API_KEY='):
                api_key = line.strip().split('=')[1]
                break

client = genai.Client(api_key=api_key)
for model in client.models.list():
    print(model.name)
