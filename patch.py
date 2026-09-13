import sys

filepath = "/app/applet/src/pages/PublicApp.tsx"
with open(filepath, "r") as f:
    content = f.read()

target1 = """                      ) : marketplaceViewMode === 'shops' ? (
                        <div className="px-4 mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[19px] font-bold text-slate-900">Featured Shops</h2>"""

replace1 = """                      ) : (
                      <>
                      {(marketplaceSearch.trim() === '' || marketplaceViewMode === 'shops') && (
                        <div className="px-4 mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[19px] font-bold text-slate-900">Featured Shops</h2>"""

target2 = """                          )}
                        </div>
                      ) : (
                        <div className="px-4 mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[19px] font-bold text-slate-900">Popular Products</h2>"""

replace2 = """                          )}
                        </div>
                      )}
                      {(marketplaceSearch.trim() === '' || marketplaceViewMode === 'products') && (
                        <div className="px-4 mt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[19px] font-bold text-slate-900">Popular Products</h2>"""

target3 = """                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedCategory === 'Food' ? ("""

replace3 = """                          )}
                        </div>
                      )}
                      </>
                      )}
                    </div>
                  </div>
                ) : selectedCategory === 'Food' ? ("""

print("Patch 1 found:", target1 in content)
print("Patch 2 found:", target2 in content)
print("Patch 3 found:", target3 in content)

content = content.replace(target1, replace1)
content = content.replace(target2, replace2)
content = content.replace(target3, replace3)

with open(filepath, "w") as f:
    f.write(content)
