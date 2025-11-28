package com.fsd_CSE.TnP_Connect.ai.service;

import com.fsd_CSE.TnP_Connect.ai.dto.AiDtos.RoadmapMonth;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoadmapService {

    private final ChatbotService chatbotService;
    private final ObjectMapper objectMapper;

    public RoadmapService(ChatbotService chatbotService, ObjectMapper objectMapper) {
        this.chatbotService = chatbotService;
        this.objectMapper = objectMapper;
    }

    public List<RoadmapMonth> generateRoadmap(String role, String skills) {
        String prompt = """
                Create a 3 month engineering prep roadmap.
                Role: %s
                Current skills: %s
                Return STRICT JSON array:
                [
                  { "month": "Month 1", "topics": ["..."], "projects": ["..."] }
                ]
                """.formatted(role, skills);
        String raw = chatbotService.promptGemini(prompt);
        
        // Handle gracefully if API quota is exceeded instead of trying to parse it as JSON
        if (raw.contains("API Rate Limit Exceeded") || raw.contains("AI Service temporarily unavailable")) {
            return List.of(new RoadmapMonth("Error", List.of("API Quota Exceeded"), List.of("Please try again later.")));
        }

        try {
            int s = raw.indexOf('[');
            int e = raw.lastIndexOf(']');
            JsonNode arr = objectMapper.readTree(raw.substring(s, e + 1));
            List<RoadmapMonth> out = new ArrayList<>();
            for (JsonNode n : arr) {
                List<String> topics = new ArrayList<>();
                List<String> projects = new ArrayList<>();
                n.path("topics").forEach(t -> topics.add(t.asText()));
                n.path("projects").forEach(p -> projects.add(p.asText()));
                out.add(new RoadmapMonth(n.path("month").asText("Month"), topics, projects));
            }
            return out;
        } catch (Exception ex) {
            return List.of(new RoadmapMonth("Parsing Error", List.of("Failed to parse AI response"), List.of("Try generating again")));
        }
    }
}
