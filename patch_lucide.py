with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """  Minus, Send, ArrowLeft, ShoppingCart, LayoutGrid, QrCode
} from 'lucide-react';"""

replacement = """  Minus, Send, ArrowLeft, ShoppingCart, LayoutGrid, QrCode, CheckCircle2
} from 'lucide-react';"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
