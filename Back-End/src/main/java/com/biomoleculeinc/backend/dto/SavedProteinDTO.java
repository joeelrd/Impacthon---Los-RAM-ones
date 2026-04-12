package com.biomoleculeinc.backend.dto;

import com.biomoleculeinc.backend.model.SavedProteinEntity;
import java.time.LocalDateTime;

public class SavedProteinDTO {
    private Long id;
    private String proteinName;
    private String pdbData;
    private String fastaSequence;
    private String jobId;
    private LocalDateTime createdAt;

    public SavedProteinDTO(SavedProteinEntity entity) {
        this.id = entity.getId();
        this.proteinName = entity.getProteinName();
        this.pdbData = entity.getPdbData();
        this.fastaSequence = entity.getFastaSequence();
        this.jobId = entity.getJobId();
        this.createdAt = entity.getCreatedAt();
    }

    public Long getId() { return id; }
    public String getProteinName() { return proteinName; }
    public String getPdbData() { return pdbData; }
    public String getFastaSequence() { return fastaSequence; }
    public String getJobId() { return jobId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

