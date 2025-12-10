package com.fsd_CSE.TnP_Connect.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.Map;

@Service
public class ChatbotService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai.gemini.api-key}")
    private String apiKey;

    @Value("${ai.gemini.model:gemini-1.5-flash}")
    private String model;

    public ChatbotService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public String answerWithPolicyContext(String query) {
        return promptGemini(query);
    }

    public String promptGemini(String prompt) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
            Map<String, Object> payload = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            String response = restTemplate.postForObject(url, entity, String.class);
            
            if (response == null || response.isBlank()) {
                return "No response from Gemini.";
            }
            JsonNode root = objectMapper.readTree(response);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode()) return "Gemini response format was unexpected.";
            
            String text = textNode.asText();
            text = text.replaceAll("(?s)```[a-zA-Z]*\\n?", "").replace("```", "").trim();
            return text;
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests ex) {
            System.err.println("Gemini Quota Exceeded (429)!");
            return "API Rate Limit Exceeded. Google API quota exhausted. Please try again in 1 minute.";
        } catch (Exception ex) {
            System.err.println("Gemini Error: " + ex.getMessage());
            return "AI Service temporarily unavailable: " + ex.getMessage();
        }
    }
}
