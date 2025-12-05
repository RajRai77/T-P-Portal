package com.fsd_CSE.TnP_Connect.ai.service;

import com.fsd_CSE.TnP_Connect.Enitities.Internship;
import com.fsd_CSE.TnP_Connect.Repository.InternshipRepository;
import com.fsd_CSE.TnP_Connect.ai.dto.AiDtos.MatchResult;
import com.fsd_CSE.TnP_Connect.ai.util.CosineSimilarityUtil;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class EmbeddingService {

    private final InternshipRepository internshipRepository;

    public EmbeddingService(InternshipRepository internshipRepository) {
        this.internshipRepository = internshipRepository;
    }

    public List<MatchResult> rankInternshipsBySkills(String studentSkills) {
        double[] studentVector = toVector(studentSkills);
        return internshipRepository.findAll().stream()
                .map(internship -> {
                    double sim = CosineSimilarityUtil.similarity(studentVector, toVector(internship.getDescription()));
                    return new MatchResult(internship.getId(), internship.getCompany(), internship.getRole(), sim);
                })
                .sorted(Comparator.comparingDouble(MatchResult::score).reversed())
                .toList();
    }

    private double[] toVector(String content) {
        String raw = content == null ? "" : content.toLowerCase();
        double[] vec = new double[8];
        for (int i = 0; i < raw.length(); i++) {
            vec[i % vec.length] += raw.charAt(i);
        }
        return vec;
    }
}
