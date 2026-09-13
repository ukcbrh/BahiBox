with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = "import React, { useState, useEffect } from 'react';"
replacement = "import React, { useState, useEffect } from 'react';\nimport { useSearchParams } from 'react-router-dom';"

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
