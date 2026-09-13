import sys

filepath = "/app/applet/src/pages/PublicApp.tsx"
with open(filepath, "r") as f:
    content = f.read()

target_a = """                    <div className="bg-[#003B95] px-4 pt-12 pb-6 text-white rounded-b-[24px]">"""

target_b = """                        <div className="flex flex-col">
                          <h1 className="text-[22px] font-bold leading-tight">Apna Bahraich</h1>
                          <div className="flex items-center text-[13px] mt-1 text-white/90">
                            <MapPin size={14} className="mr-1" />
                            <span>Bahraich, UP</span>
                            <span className="mx-1.5">•</span>
                            <span className="text-[#ea580c] font-semibold underline cursor-pointer">Change</span>
                          </div>
                        </div>"""

print("Target A exists:", target_a in content)
print("Target B exists:", target_b in content)
