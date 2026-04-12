package com.biomoleculeinc.backend.controller;

import com.biomoleculeinc.backend.dto.JobSubmitRequest;
import com.biomoleculeinc.backend.model.JobEntity;
import com.biomoleculeinc.backend.service.CesgaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final CesgaService cesgaService;

    public JobController(CesgaService cesgaService) {
        this.cesgaService = cesgaService;
    }

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitJob(@RequestBody JobSubmitRequest request) {
        return ResponseEntity.ok(cesgaService.submitJob(request));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getJobStatus(@PathVariable String id) {
        return ResponseEntity.ok(cesgaService.getJobStatus(id));
    }

    @GetMapping("/{id}/outputs")
    public ResponseEntity<Map<String, Object>> getJobOutputs(@PathVariable String id) {
        return ResponseEntity.ok(cesgaService.getJobOutputs(id));
    }

    @GetMapping("/history")
    public ResponseEntity<List<JobEntity>> getJobHistory(@RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(cesgaService.getJobHistory(userId));
    }

    @GetMapping("/proteins")
    public ResponseEntity<List> getPredefinedProteins() {
        return ResponseEntity.ok(cesgaService.getPredefinedProteins());
    }

    @GetMapping("/proteins/{id}")
    public ResponseEntity<Map<String, Object>> getProteinDetails(@PathVariable String id) {
        return ResponseEntity.ok(cesgaService.getProteinDetails(id));
    }

    @GetMapping("/{id}/accounting")
    public ResponseEntity<Map<String, Object>> getJobAccounting(@PathVariable String id) {
        return ResponseEntity.ok(cesgaService.getJobAccounting(id));
    }

    @GetMapping("/proteins/stats")
    public ResponseEntity<Map<String, Object>> getGlobalStats() {
        return ResponseEntity.ok(cesgaService.getGlobalStats());
    }

    @GetMapping("/proteins/samples")
    public ResponseEntity<List> getProteinSamples() {
        return ResponseEntity.ok(cesgaService.getProteinSamples());
    }
}
