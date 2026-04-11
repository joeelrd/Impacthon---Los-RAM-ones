package com.localfold.backend.repository;

import com.localfold.backend.model.JobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<JobEntity, String> {
    List<JobEntity> findAllByOrderByCreatedAtDesc();
    List<JobEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
}
