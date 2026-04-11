package com.localfold.backend.service;

import com.localfold.backend.dto.ProteinSaveRequest;
import com.localfold.backend.dto.SavedProteinDTO;
import com.localfold.backend.model.SavedProteinEntity;
import com.localfold.backend.model.User;
import com.localfold.backend.repository.SavedProteinRepository;
import com.localfold.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProteinService {

    @Autowired
    private SavedProteinRepository savedProteinRepository;

    @Autowired
    private UserRepository userRepository;

    public SavedProteinDTO saveProtein(ProteinSaveRequest request) {
        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        long currentCount = savedProteinRepository.countByUserId(user.getId());
        long maxLimit = user.isPremium() ? 30 : 8;

        if (currentCount >= maxLimit) {
            throw new IllegalStateException("Storage limit reached for user (" + (user.isPremium() ? "Premium" : "Base") + ")");
        }

        SavedProteinEntity entity = new SavedProteinEntity(
            request.getProteinName(),
            request.getPdbData(),
            request.getFastaSequence(),
            request.getJobId(),
            LocalDateTime.now(),
            user
        );

        SavedProteinEntity saved = savedProteinRepository.save(entity);
        return new SavedProteinDTO(saved);
    }

    public List<SavedProteinDTO> getUserProteins(Long userId) {
        return savedProteinRepository.findByUserId(userId).stream()
            .map(SavedProteinDTO::new)
            .collect(Collectors.toList());
    }

    public void deleteProtein(Long proteinId) {
        savedProteinRepository.deleteById(proteinId);
    }
}
