package com.localfold.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
public class JobEntity {

    @Id
    private String id;
    
    private String status;
    private String fastaFilename;
    private LocalDateTime createdAt;
    private Long userId;
    
    public JobEntity() {
    }

    public JobEntity(String id, String status, String fastaFilename, LocalDateTime createdAt, Long userId) {
        this.id = id;
        this.status = status;
        this.fastaFilename = fastaFilename;
        this.createdAt = createdAt;
        this.userId = userId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFastaFilename() { return fastaFilename; }
    public void setFastaFilename(String fastaFilename) { this.fastaFilename = fastaFilename; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
}
