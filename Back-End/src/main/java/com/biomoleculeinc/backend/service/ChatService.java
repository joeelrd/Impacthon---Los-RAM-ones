package com.biomoleculeinc.backend.service;

import com.biomoleculeinc.backend.dto.ChatRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final RestTemplate restTemplate;

    public ChatService() {
        this.restTemplate = new RestTemplate();
    }

    public Map<String, String> askGemini(ChatRequest request) {
        String url = geminiApiUrl + "?key=" + geminiApiKey;

        // Construct the prompt
        StringBuilder promptBuilder = new StringBuilder();
        if (request.getContext() != null && !request.getContext().isEmpty()) {
            promptBuilder.append("Contexto de la proteína actual:\n");
            for (Map.Entry<String, Object> entry : request.getContext().entrySet()) {
                promptBuilder.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
            promptBuilder.append("\n");
        }
        
        promptBuilder.append("Usuario dice: ").append(request.getMessage()).append("\n\n");
        promptBuilder.append("Actúa como un bioinformático experto. Responde en Markdown y de forma concisa.");

        // Build Payload
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", promptBuilder.toString());

        List<Map<String, Object>> partsList = new ArrayList<>();
        partsList.add(textPart);

        Map<String, Object> contentMap = new HashMap<>();
        contentMap.put("parts", partsList);

        List<Map<String, Object>> contentsList = new ArrayList<>();
        contentsList.add(contentMap);

        Map<String, Object> payload = new HashMap<>();
        payload.put("contents", contentsList);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (!parts.isEmpty()) {
                        String botReply = (String) parts.get(0).get("text");
                        return Map.of("reply", botReply);
                    }
                }
            }
            return Map.of("reply", "No se obtuvo respuesta de la IA.");
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("reply", "Hubo un error de conexión con la IA: " + e.getMessage());
        }
    }
}
