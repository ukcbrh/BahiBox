import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
    content = f.read()

func_start = content.find("const handleAddProduct = async")
if func_start == -1:
    print("Function handleAddProduct not found")
else:
    # Find the end of the function (roughly)
    # Inside it, find "toast.success" and then "setNewProduct"
    toast_idx = content.find("toast.success", func_start)
    if toast_idx == -1:
        print("toast.success not found in handleAddProduct")
    else:
        reset_idx = content.find("setNewProduct({", toast_idx)
        if reset_idx == -1:
            print("setNewProduct not found after toast.success")
        else:
            brace_count = 0
            in_call = False
            end_idx = -1
            for i in range(reset_idx, len(content)):
                if content[i] == '{':
                    if not in_call:
                        in_call = True
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if in_call and brace_count == 0:
                        # Need to include the closing })
                        # Let's find the closing parenthesis
                        paren_idx = content.find(')', i)
                        if paren_idx != -1:
                            end_idx = paren_idx
                        else:
                            end_idx = i
                        break
            if end_idx != -1:
                print(content[reset_idx:end_idx+1])
            else:
                print("Could not parse setNewProduct block")
