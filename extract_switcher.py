with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

start_switch = content.find("{/* Purchased Modules Switcher */}")
if start_switch != -1:
    end_switch = content.find("</button>", start_switch)
    end_switch = content.find("</div>", end_switch)
    end_switch = content.find("</div>", end_switch + 1)
    end_switch = content.find("</div>", end_switch + 1)
    
    # Just grab ~800 chars from start_switch to be safe
    print(content[start_switch:start_switch+1800])
