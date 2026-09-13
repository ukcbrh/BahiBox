with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """      {linkMode && selectedForLink.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button className="gap-2 shadow-xl" onClick={handleLinkTables}>
            Link {selectedForLink.length} Tables
          </Button>
        </div>
      )}
      {linkMode && selectedForLink.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button className="gap-2 shadow-xl" onClick={handleLinkTables}>
            Link {selectedForLink.length} Tables
          </Button>
        </div>
      )}"""

replacement = """      {linkMode && selectedForLink.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button className="gap-2 shadow-xl" onClick={handleLinkTables}>
            Link {selectedForLink.length} Tables
          </Button>
        </div>
      )}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
