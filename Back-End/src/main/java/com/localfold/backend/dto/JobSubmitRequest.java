package com.localfold.backend.dto;

public class JobSubmitRequest {
    private String fastaSequence;
    private String fastaFilename;

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
}
