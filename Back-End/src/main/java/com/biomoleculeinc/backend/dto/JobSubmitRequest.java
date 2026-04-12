package com.biomoleculeinc.backend.dto;

public class JobSubmitRequest {
    private String fastaSequence;
    private String fastaFilename;
    private Long userId;

    public String getFastaSequence() {
        return fastaSequence;
    }
    public void setFastaSequence(String fastaSequence) {
        this.fastaSequence = fastaSequence;
    }
    public String getFastaFilename() {
        return fastaFilename;
    }
    public void setFastaFilename(String fastaFilename) {
        this.fastaFilename = fastaFilename;
    }
    public Long getUserId() {
        return userId;
    }
    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
