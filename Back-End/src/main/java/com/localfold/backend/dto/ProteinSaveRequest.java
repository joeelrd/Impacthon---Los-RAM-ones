package com.localfold.backend.dto;

public class ProteinSaveRequest {
    private Long userId;
    private String proteinName;
    private String pdbData;
    private String fastaSequence;
    private String jobId;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getProteinName() { return proteinName; }
    public void setProteinName(String proteinName) { this.proteinName = proteinName; }

    public String getPdbData() { return pdbData; }
    public void setPdbData(String pdbData) { this.pdbData = pdbData; }

    public String getFastaSequence() { return fastaSequence; }
    public void setFastaSequence(String fastaSequence) { this.fastaSequence = fastaSequence; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
}
