package com.fsd_CSE.TnP_Connect.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fsd_CSE.TnP_Connect.ai.dto.AiDtos.ResumeBuildResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ResumeAiService {

    private final ChatbotService chatbotService;
    private final ObjectMapper objectMapper;

    public ResumeAiService(ChatbotService chatbotService, ObjectMapper objectMapper) {
        this.chatbotService = chatbotService;
        this.objectMapper = objectMapper;
    }

    public ResumeBuildResponse buildResume(String role, String qualification, String existingContent) {
        String prompt = """
                You are an expert resume writer for engineering students.
                Target role: %s
                Qualification: %s
                Existing content: %s
                
                Return STRICT JSON:
                {
                  "optimizedResume": "full optimized resume text",
                  "suggestions": ["tip1","tip2","tip3","tip4"]
                }
                """.formatted(role, qualification, existingContent);

        String raw = chatbotService.promptGemini(prompt);
        try {
            int s = raw.indexOf('{');
            int e = raw.lastIndexOf('}');
            JsonNode root = objectMapper.readTree(raw.substring(s, e + 1));
            List<String> suggestions = new ArrayList<>();
            root.path("suggestions").forEach(x -> suggestions.add(x.asText()));
            return new ResumeBuildResponse(root.path("optimizedResume").asText(""), suggestions);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse resume builder response from Gemini.");
        }
    }
}
