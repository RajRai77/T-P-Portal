package com.fsd_CSE.TnP_Connect.ai.service;

import com.fsd_CSE.TnP_Connect.ai.dto.AiDtos.InterviewEvaluateResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class InterviewService {

    private final ChatbotService chatbotService;
    private final ObjectMapper objectMapper;

    public InterviewService(ChatbotService chatbotService, ObjectMapper objectMapper) {
        this.chatbotService = chatbotService;
        this.objectMapper = objectMapper;
    }

    public List<String> generateQuestions(String jd) {
        String prompt = """
                Generate exactly 5 technical interview questions for this job description.
                Return STRICT JSON:
                { "questions": ["q1","q2","q3","q4","q5"] }
                JD:
                """ + jd;
        String raw = chatbotService.promptGemini(prompt);
        try {
            int s = raw.indexOf('{');
            int e = raw.lastIndexOf('}');
            JsonNode root = objectMapper.readTree(raw.substring(s, e + 1));
            List<String> questions = new ArrayList<>();
            root.path("questions").forEach(q -> questions.add(q.asText()));
            return questions.stream().limit(5).toList();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse interview questions from Gemini.");
        }
    }

    public InterviewEvaluateResponse evaluateAnswer(String question, String transcript) {
        String prompt = """
                Evaluate this interview answer. Return STRICT JSON:
                {
                  "score": <integer out of 10>,
                  "improvements": ["point1","point2","point3"]
                }
                Question:
                """ + question + """
                
                Transcript:
                """ + transcript;
        String raw = chatbotService.promptGemini(prompt);
        try {
            int s = raw.indexOf('{');
            int e = raw.lastIndexOf('}');
            JsonNode root = objectMapper.readTree(raw.substring(s, e + 1));
            int score = root.path("score").asInt(0);
            List<String> improvements = new ArrayList<>();
            root.path("improvements").forEach(i -> improvements.add(i.asText()));
            return new InterviewEvaluateResponse(score, improvements);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse interview evaluation from Gemini.");
        }
    }
}
