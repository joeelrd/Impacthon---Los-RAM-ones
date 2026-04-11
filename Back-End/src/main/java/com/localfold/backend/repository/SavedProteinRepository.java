package com.localfold.backend.repository;

import com.localfold.backend.model.SavedProteinEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedProteinRepository extends JpaRepository<SavedProteinEntity, Long> {
    List<SavedProteinEntity> findByUserId(Long userId);
    long countByUserId(Long userId);
}
