import re

with open("src/components/retail/RetailProductsInventory.tsx", "r") as f:
    text = f.read()

text = text.replace("category_plus: false,", "category_plus: true,")
text = text.replace("cmb_gst: false", "cmb_gst: true")
text = text.replace("cgst: false,", "cgst: true,")
text = text.replace("sgst: false,", "sgst: true,")
text = text.replace("igst: false,", "igst: true,")

with open("src/components/retail/RetailProductsInventory.tsx", "w") as f:
    f.write(text)
