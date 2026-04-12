package com.biomoleculeinc.backend.repository;

import com.biomoleculeinc.backend.model.SavedProteinEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedProteinRepository extends JpaRepository<SavedProteinEntity, Long> {
    List<SavedProteinEntity> findByUserId(Long userId);
    List<SavedProteinEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserId(Long userId);
}

