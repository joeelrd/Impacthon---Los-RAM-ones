package com.localfold.backend.controller;

import com.localfold.backend.dto.ChatRequest;
import com.localfold.backend.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> askGemini(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatService.askGemini(request));
    }
}
