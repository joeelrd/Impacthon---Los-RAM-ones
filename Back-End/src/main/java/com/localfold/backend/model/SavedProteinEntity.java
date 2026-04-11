package com.localfold.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_proteins")
public class SavedProteinEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String proteinName;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String pdbData;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String fastaSequence;

    private String jobId;

    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public SavedProteinEntity() {}

    public SavedProteinEntity(String proteinName, String pdbData, String fastaSequence, String jobId, LocalDateTime createdAt, User user) {
        this.proteinName = proteinName;
        this.pdbData = pdbData;
        this.fastaSequence = fastaSequence;
        this.jobId = jobId;
        this.createdAt = createdAt;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProteinName() { return proteinName; }
    public void setProteinName(String proteinName) { this.proteinName = proteinName; }

    public String getPdbData() { return pdbData; }
    public void setPdbData(String pdbData) { this.pdbData = pdbData; }

    public String getFastaSequence() { return fastaSequence; }
    public void setFastaSequence(String fastaSequence) { this.fastaSequence = fastaSequence; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
