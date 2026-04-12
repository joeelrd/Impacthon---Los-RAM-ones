package com.biomoleculeinc.backend.controller;

import com.biomoleculeinc.backend.dto.ProteinSaveRequest;
import com.biomoleculeinc.backend.dto.SavedProteinDTO;
import com.biomoleculeinc.backend.service.ProteinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proteins")
public class ProteinController {

    @Autowired
    private ProteinService proteinService;

    @PostMapping("/save")
    public ResponseEntity<?> saveProtein(@RequestBody ProteinSaveRequest request) {
        try {
            SavedProteinDTO saved = proteinService.saveProtein(request);
            return ResponseEntity.ok(saved);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error saving protein: " + e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SavedProteinDTO>> getUserProteins(@PathVariable Long userId) {
        return ResponseEntity.ok(proteinService.getUserProteins(userId));
    }

    @DeleteMapping("/{proteinId}")
    public ResponseEntity<?> deleteProtein(@PathVariable Long proteinId) {
        try {
            proteinService.deleteProtein(proteinId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error deleting protein: " + e.getMessage());
        }
    }
}
