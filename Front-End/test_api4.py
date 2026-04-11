import requests
res = requests.post("https://api-mock-cesga.onrender.com/jobs/submit", json={"fasta_sequence": ">test\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR", "fasta_filename": "test.fasta"})
if res.ok:
    job_id = res.json().get("job_id")
    import time
    time.sleep(12)
    out = requests.get(f"https://api-mock-cesga.onrender.com/jobs/{job_id}/outputs").json()
    print("PDB file content:")
    print(out["structural_data"].get("pdb_file"))
    print("\n\nCIF file content (length):", len(out["structural_data"].get("cif_file", "")))
