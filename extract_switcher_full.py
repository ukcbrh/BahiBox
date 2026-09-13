with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

start_idx = content.find("Purchased Modules Switcher")
if start_idx != -1:
    end_idx = content.find("              </div>\n            </nav>", start_idx)
    if end_idx != -1:
        print(content[start_idx-4:end_idx+20])
