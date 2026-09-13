with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target1 = "  const [editingTable, setEditingTable] = useState<any>(null);"
replacement1 = """  const [editingTable, setEditingTable] = useState<any>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [selectedForLink, setSelectedForLink] = useState<string[]>([]);"""

target2 = "        <Button className=\"gap-2\" onClick={() => setIsAddingTable(true)}><Plus size={16} /> Table</Button>"
replacement2 = """        <Button variant="outline" className="gap-2" onClick={() => { setLinkMode(!linkMode); setSelectedForLink([]); }}>
          {linkMode ? 'Cancel Link' : 'Link Tables'}
        </Button>
        <Button className="gap-2" onClick={() => setIsAddingTable(true)}><Plus size={16} /> Table</Button>"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
    f.write(content)
print("Done")
