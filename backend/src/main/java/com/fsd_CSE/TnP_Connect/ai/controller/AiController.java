package com.fsd_CSE.TnP_Connect.ai.controller;

import com.fsd_CSE.TnP_Connect.Enitities.Internship;
import com.fsd_CSE.TnP_Connect.Enitities.InternshipApplication;
import com.fsd_CSE.TnP_Connect.Repository.InternshipApplicationRepository;
import com.fsd_CSE.TnP_Connect.Repository.InternshipRepository;
import com.fsd_CSE.TnP_Connect.ai.dto.AiDtos.*;
import com.fsd_CSE.TnP_Connect.ai.service.ChatbotService;
import com.fsd_CSE.TnP_Connect.ai.service.EmbeddingService;
import com.fsd_CSE.TnP_Connect.ai.service.InterviewService;
import com.fsd_CSE.TnP_Connect.ai.service.ResumeParserService;
import com.fsd_CSE.TnP_Connect.ai.service.RoadmapService;
import com.fsd_CSE.TnP_Connect.ai.service.ResumeAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final InterviewService interviewService;
    private final EmbeddingService embeddingService;
    private final RoadmapService roadmapService;
    private final ChatbotService chatbotService;
    private final InternshipRepository internshipRepository;
    private final InternshipApplicationRepository applicationRepository;
    private final ResumeParserService resumeParserService;
    private final ResumeAiService resumeAiService;

    public AiController(
            InterviewService interviewService,
            EmbeddingService embeddingService,
            RoadmapService roadmapService,
            ChatbotService chatbotService,
            InternshipRepository internshipRepository,
            InternshipApplicationRepository applicationRepository,
            ResumeParserService resumeParserService,
            ResumeAiService resumeAiService
    ) {
        this.interviewService = interviewService;
        this.embeddingService = embeddingService;
        this.roadmapService = roadmapService;
        this.chatbotService = chatbotService;
        this.internshipRepository = internshipRepository;
        this.applicationRepository = applicationRepository;
        this.resumeParserService = resumeParserService;
        this.resumeAiService = resumeAiService;
    }

    @PostMapping("/interview/questions")
    public ResponseEntity<List<String>> generateQuestions(@RequestBody InterviewQuestionRequest request) {
        return ResponseEntity.ok(interviewService.generateQuestions(request.jd()));
    }

    @PostMapping("/interview/evaluate")
    public ResponseEntity<InterviewEvaluateResponse> evaluate(@RequestBody InterviewEvaluateRequest request) {
        return ResponseEntity.ok(interviewService.evaluateAnswer(request.question(), request.transcript()));
    }

    @PostMapping("/roadmap")
    public ResponseEntity<List<RoadmapMonth>> roadmap(@RequestBody RoadmapRequest request) {
        return ResponseEntity.ok(roadmapService.generateRoadmap(request.targetRole(), request.currentSkills()));
    }

    @GetMapping("/matches")
    public ResponseEntity<List<MatchResult>> matches(@RequestParam String skills) {
        return ResponseEntity.ok(embeddingService.rankInternshipsBySkills(skills));
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(new ChatResponse(chatbotService.answerWithPolicyContext(request.query())));
    }

    @PostMapping("/resume/build")
    public ResponseEntity<ResumeBuildResponse> buildResume(@RequestBody ResumeBuildRequest request) {
        return ResponseEntity.ok(
                resumeAiService.buildResume(request.role(), request.qualification(), request.existingContent())
        );
    }

    @GetMapping("/prep/resources")
    public ResponseEntity<List<PrepResource>> prepResources(@RequestParam(defaultValue = "Software Engineering") String topic) {
        String prompt = "Generate a list of 5 best preparation resources (websites, courses, books) for the topic: " + topic + ". " +
                        "Return strictly a JSON array of objects with keys 'subject', 'title', and 'url'. " +
                        "Example: [{\"subject\": \"DSA\", \"title\": \"NeetCode\", \"url\": \"https://neetcode.io\"}]";
        String raw = chatbotService.promptGemini(prompt);
        try {
            int s = raw.indexOf('[');
            int e = raw.lastIndexOf(']');
            com.fasterxml.jackson.databind.JsonNode arr = new com.fasterxml.jackson.databind.ObjectMapper().readTree(raw.substring(s, e + 1));
            List<PrepResource> out = new java.util.ArrayList<>();
            for (com.fasterxml.jackson.databind.JsonNode n : arr) {
                out.add(new PrepResource(
                    n.path("subject").asText(""), 
                    n.path("title").asText(""), 
                    n.path("url").asText("")
                ));
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/shortlist/{internshipId}")
    public ResponseEntity<List<ShortlistResult>> shortlist(@PathVariable Integer internshipId) {
        Internship internship = internshipRepository.findById(internshipId).orElseThrow(() -> new IllegalArgumentException("Internship not found"));
        List<InternshipApplication> applications = applicationRepository.findByInternshipId(internshipId);

        List<ShortlistResult> ranked = applications.stream().map(app -> {
            Integer studentId = app.getStudent().getId();
            String studentName = app.getStudent().getName();
            double score = 0;
            File resumeFile = new File("uploads/resumes/" + studentId + ".pdf");
            if (resumeFile.exists()) {
                try {
                    String resumeText = resumeParserService.extractText(resumeFile);
                    int jdLength = internship.getDescription() == null ? 1 : internship.getDescription().length();
                    score = Math.min(100, (resumeText.length() * 100.0) / (jdLength * 2.0));
                } catch (Exception ignored) {
                    score = 0;
                }
            }
            return new ShortlistResult(studentId, studentName, score);
        }).sorted(Comparator.comparingDouble(ShortlistResult::matchPercentage).reversed()).toList();

        return ResponseEntity.ok(ranked);
    }
}
