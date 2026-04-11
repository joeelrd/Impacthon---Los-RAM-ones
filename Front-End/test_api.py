import requests
import json
import time
res = requests.post("https://api-mock-cesga.onrender.com/jobs/submit", json={"fasta_sequence": ">test\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR", "fasta_filename": "test.fasta"})
if res.ok:
    job_id = res.json().get("job_id")
    for _ in range(10):
        status = requests.get(f"https://api-mock-cesga.onrender.com/jobs/{job_id}/status").json().get("status")
        if status == "COMPLETED":
            out = requests.get(f"https://api-mock-cesga.onrender.com/jobs/{job_id}/outputs")
            out_json = out.json()
            # remove pdb_file/pae_matrix for brevity
            if "structural_data" in out_json and "pdb_file" in out_json["structural_data"]:
                del out_json["structural_data"]["pdb_file"]
            if "structural_data" in out_json and "pae_matrix" in out_json["structural_data"]:
                del out_json["structural_data"]["pae_matrix"]
            print(json.dumps(out_json, indent=2))
            break
        time.sleep(2)
