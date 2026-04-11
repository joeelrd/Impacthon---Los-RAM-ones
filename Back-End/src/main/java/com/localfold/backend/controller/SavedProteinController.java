package com.localfold.backend.controller;

import com.localfold.backend.dto.ProteinSaveRequest;
import com.localfold.backend.dto.SavedProteinDTO;
import com.localfold.backend.model.SavedProteinEntity;
import com.localfold.backend.model.User;
import com.localfold.backend.repository.SavedProteinRepository;
import com.localfold.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/saved-proteins")
@CrossOrigin(origins = "*")
public class SavedProteinController {

    private static final int FREE_LIMIT = 8;
    private static final int PREMIUM_LIMIT = 30;

    @Autowired
    private SavedProteinRepository savedProteinRepository;

    @Autowired
    private UserRepository userRepository;

    /** GET /api/saved-proteins?userId=X — lista las proteínas guardadas del usuario */
    @GetMapping
    public ResponseEntity<?> getSavedProteins(@RequestParam Long userId) {
        List<SavedProteinDTO> proteins = savedProteinRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(SavedProteinDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(proteins);
    }

    /** GET /api/saved-proteins/count?userId=X — número de proteínas guardadas */
    @GetMapping("/count")
    public ResponseEntity<?> getCount(@RequestParam Long userId) {
        long count = savedProteinRepository.countByUserId(userId);

        Optional<User> userOpt = userRepository.findById(userId);
        int limit = FREE_LIMIT;
        if (userOpt.isPresent() && userOpt.get().isPremium()) {
            limit = PREMIUM_LIMIT;
        }

        return ResponseEntity.ok(Map.of(
                "count", count,
                "limit", limit,
                "isPremium", userOpt.map(User::isPremium).orElse(false)
        ));
    }

    /** POST /api/saved-proteins — guarda una proteína (con verificación de límite) */
    @PostMapping
    public ResponseEntity<?> saveProtein(@RequestBody ProteinSaveRequest request) {
        Optional<User> userOpt = userRepository.findById(request.getUserId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Usuario no encontrado."));
        }

        User user = userOpt.get();
        long currentCount = savedProteinRepository.countByUserId(user.getId());
        int limit = user.isPremium() ? PREMIUM_LIMIT : FREE_LIMIT;

        if (currentCount >= limit) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "message", "Has alcanzado el límite de proteínas guardadas (" + limit + ").",
                    "count", currentCount,
                    "limit", limit,
                    "isPremium", user.isPremium()
            ));
        }

        SavedProteinEntity entity = new SavedProteinEntity(
                request.getProteinName(),
                request.getPdbData(),
                request.getFastaSequence(),
                request.getJobId(),
                LocalDateTime.now(),
                user
        );
        savedProteinRepository.save(entity);

        return ResponseEntity.ok(new SavedProteinDTO(entity));
    }

    /** DELETE /api/saved-proteins/{id} — elimina una proteína guardada */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProtein(@PathVariable Long id, @RequestParam Long userId) {
        Optional<SavedProteinEntity> entityOpt = savedProteinRepository.findById(id);
        if (entityOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Proteína no encontrada."));
        }

        SavedProteinEntity entity = entityOpt.get();
        // Verificar que pertenece al usuario que hace la petición
        if (!entity.getUser().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "No tienes permiso para eliminar esta proteína."));
        }

        savedProteinRepository.delete(entity);
        return ResponseEntity.ok(Map.of("message", "Proteína eliminada correctamente."));
    }
}
