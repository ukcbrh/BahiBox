with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "<Route path=\"/scan\" element={<ScanAndGo />} />",
    "<Route path=\"/scan\" element={<ScanAndGo />} />\n            <Route path=\"/table-order\" element={<HospitalityTableOrder />} />"
)

content = content.replace(
    "import ScanAndGo from './pages/ScanAndGo';",
    "import ScanAndGo from './pages/ScanAndGo';\nimport { HospitalityTableOrder } from './components/hospitality/HospitalityComponents';"
)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Done")
