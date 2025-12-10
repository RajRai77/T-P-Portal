package com.fsd_CSE.TnP_Connect.ai.dto;

import java.util.List;

public class AiDtos {

    public record InterviewQuestionRequest(String jd) {}
    public record InterviewEvaluateRequest(String question, String transcript) {}
    public record InterviewEvaluateResponse(int score, List<String> improvements) {}
    public record RoadmapRequest(String targetRole, String currentSkills) {}
    public record RoadmapMonth(String month, List<String> topics, List<String> projects) {}
    public record ChatRequest(String query) {}
    public record ChatResponse(String answer) {}
    public record ResumeBuildRequest(String role, String qualification, String existingContent) {}
    public record ResumeBuildResponse(String optimizedResume, List<String> suggestions) {}
    public record PrepResource(String subject, String title, String url) {}
    public record MatchResult(Integer internshipId, String company, String role, double score) {}
    public record ShortlistResult(Integer studentId, String studentName, double matchPercentage) {}
}
