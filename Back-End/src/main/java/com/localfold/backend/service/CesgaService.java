package com.localfold.backend.service;

import com.localfold.backend.dto.JobSubmitRequest;
import com.localfold.backend.model.JobEntity;
import com.localfold.backend.repository.JobRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CesgaService {

    private final RestTemplate restTemplate;
    private final JobRepository jobRepository;

    @Value("${cesga.api.url}")
    private String cesgaApiUrl;

    public CesgaService(RestTemplate restTemplate, JobRepository jobRepository) {
        this.restTemplate = restTemplate;
        this.jobRepository = jobRepository;
    }

    public Map<String, Object> submitJob(JobSubmitRequest request) {
        String submitUrl = cesgaApiUrl + "/jobs/submit";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, Object> body = new HashMap<>();
        body.put("fasta_sequence", request.getFastaSequence());
        body.put("fasta_filename", request.getFastaFilename() != null && !request.getFastaFilename().isEmpty() ? request.getFastaFilename() : "sequence.fasta");
        body.put("gpus", 1);
        body.put("cpus", 4);
        body.put("memory_gb", 16.0);
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        
        ResponseEntity<Map> response = restTemplate.postForEntity(submitUrl, entity, Map.class);
        
        Map<String, Object> responseBody = response.getBody();
        if (responseBody != null && responseBody.containsKey("job_id")) {
            String jobId = (String) responseBody.get("job_id");
            String status = (String) responseBody.get("status");
            
            // Save to local database
            JobEntity job = new JobEntity(jobId, status, (String) body.get("fasta_filename"), LocalDateTime.now());
            jobRepository.save(job);
        }
        
        return responseBody;
    }

    public Map<String, Object> getJobStatus(String jobId) {
        String statusUrl = cesgaApiUrl + "/jobs/" + jobId + "/status";
        ResponseEntity<Map> response = restTemplate.getForEntity(statusUrl, Map.class);
        
        Map<String, Object> responseBody = response.getBody();
        if (responseBody != null && responseBody.containsKey("status")) {
            // Update local state if needed
            Optional<JobEntity> optionalJob = jobRepository.findById(jobId);
            if (optionalJob.isPresent()) {
                JobEntity job = optionalJob.get();
                job.setStatus((String) responseBody.get("status"));
                jobRepository.save(job);
            }
        }
        return responseBody;
    }

    public Map<String, Object> getJobOutputs(String jobId) {
        String outputsUrl = cesgaApiUrl + "/jobs/" + jobId + "/outputs";
        ResponseEntity<Map> response = restTemplate.getForEntity(outputsUrl, Map.class);
        return response.getBody();
    }
    
    public List<JobEntity> getJobHistory() {
        return jobRepository.findAllByOrderByCreatedAtDesc();
    }
}
