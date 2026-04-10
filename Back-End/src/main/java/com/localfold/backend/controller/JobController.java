package com.localfold.backend.controller;

import com.localfold.backend.dto.JobSubmitRequest;
import com.localfold.backend.model.JobEntity;
import com.localfold.backend.service.CesgaService;
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
    public ResponseEntity<List<JobEntity>> getJobHistory() {
        return ResponseEntity.ok(cesgaService.getJobHistory());
    }
}
