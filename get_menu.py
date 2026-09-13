import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

def get_block(start_str):
    start_idx = content.find(start_str)
    if start_idx == -1:
         return "Not found"
    
    brace_count = 0
    in_block = False
    end_idx = -1
    for i in range(start_idx, len(content)):
         if content[i] == '{' or content[i] == '(':
              if not in_block:
                  in_block = True
              brace_count += 1
         elif content[i] == '}' or content[i] == ')':
              brace_count -= 1
              if in_block and brace_count == 0:
                   end_idx = i
                   break
    if end_idx != -1:
         return content[start_idx:end_idx+1]
    return "End not found"

print("--- fetchMenuItems ---")
print(get_block("const fetchMenuItems = async () => {"))
