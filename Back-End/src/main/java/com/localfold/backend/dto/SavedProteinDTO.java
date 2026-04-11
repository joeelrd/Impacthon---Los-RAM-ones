package com.localfold.backend.dto;

import com.localfold.backend.model.SavedProteinEntity;
import java.time.LocalDateTime;

public class SavedProteinDTO {
    private Long id;
    private String proteinName;
    private String pdbData;
    private String jobId;
    private LocalDateTime createdAt;

    public SavedProteinDTO(SavedProteinEntity entity) {
        this.id = entity.getId();
        this.proteinName = entity.getProteinName();
        this.pdbData = entity.getPdbData();
        this.jobId = entity.getJobId();
        this.createdAt = entity.getCreatedAt();
    }

    public Long getId() { return id; }
    public String getProteinName() { return proteinName; }
    public String getPdbData() { return pdbData; }
    public String getJobId() { return jobId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
