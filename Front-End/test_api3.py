import requests
import json
import time
res = requests.post("https://api-mock-cesga.onrender.com/jobs/submit", json={"fasta_sequence": ">test\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR", "fasta_filename": "test.fasta"})
if res.ok:
    job_id = res.json().get("job_id")
    while True:
        status = requests.get(f"https://api-mock-cesga.onrender.com/jobs/{job_id}/status").json().get("status")
        if status == "COMPLETED":
            out = requests.get(f"https://api-mock-cesga.onrender.com/jobs/{job_id}/outputs").json()
            print("Keys in out_json:", list(out.keys()))
            if "structural_data" in out:
                print("Keys in structural_data:", list(out["structural_data"].keys()))
                pdb = out["structural_data"].get("pdb_file")
                print("PDB file length:", len(pdb) if pdb else "null")
                if pdb:
                    print("First 100 chars of PDB:", pdb[:100])
                    # Does it have weird formatting?
                    if not (pdb.startswith("ATOM") or pdb.startswith("HEADER") or pdb.startswith("REMARK")):
                        print("WEIRD PDB detected:", pdb[:500])
            break
        time.sleep(2)
