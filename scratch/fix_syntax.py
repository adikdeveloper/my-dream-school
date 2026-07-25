import os

file_path = r"c:\Users\Администратор\Documents\My Dream School\frontend\src\components\admin\PaymentManagement.js"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for i in range(len(lines)):
    if "bank-balance" in lines[i]:
        # Found the start of the bank balance card
        # Now look for the next few closing divs
        for j in range(i, i + 30):
            if ")} " in lines[j] or ")} \n" in lines[j] or lines[j].strip() == ")}":
                # Found the end of the conditional block
                # Check if we have 4 closing divs before it (balance-info, balance-card, balance-cards, real-balance-section)
                # But currently we only have 3
                if "</div>" in lines[j-1] and "</div>" in lines[j-2] and "</div>" in lines[j-3]:
                     # We only have 3 closing divs. Add the 4th.
                     lines.insert(j, "        </div>\n")
                     found = True
                     break
        if found: break

if found:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed!")
else:
    print("Could not find the target block.")
