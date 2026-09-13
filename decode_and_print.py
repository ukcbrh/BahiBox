import base64
import sys
with open('b64.txt', 'r') as f:
    b64 = f.read()
decoded = base64.b64decode(b64).decode('utf-8')
print("```tsx")
print(decoded)
print("```")
