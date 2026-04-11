import requests
import json

proteins = requests.get("https://api-mock-cesga.onrender.com/proteins/").json()
if proteins:
    prot_id = proteins[0]["protein_id"]
    print("Predefined protein_id:", prot_id)
    out = requests.get(f"https://api-mock-cesga.onrender.com/proteins/{prot_id}")
    out_json = out.json()
    print("Keys in output:", list(out_json.keys()))
    if "structural_data" in out_json:
        print("Keys in structural_data:", list(out_json["structural_data"].keys()))
        if "pdb_file" in out_json["structural_data"]:
            pdb = out_json["structural_data"]["pdb_file"]
            print("PDB file length:", len(pdb) if pdb else "null")
            if pdb:
                print("First 100 chars of PDB:", pdb[:100])
        else:
            print("No pdb_file in structural_data")
