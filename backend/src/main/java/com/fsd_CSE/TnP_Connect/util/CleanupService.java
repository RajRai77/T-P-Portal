package com.fsd_CSE.TnP_Connect.util;

import com.fsd_CSE.TnP_Connect.Repository.InternshipRepository;
import com.fsd_CSE.TnP_Connect.Repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Service
public class CleanupService {

    @Autowired
    private InternshipRepository internshipRepository;

    @Autowired
    private SessionRepository sessionRepository;

    // Runs every day at 2:00 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void deleteOldRecords() {
        // Delete internships older than 2 months past deadline
        LocalDate twoMonthsAgo = LocalDate.now().minusMonths(2);
        internshipRepository.deleteByDeadlineBefore(twoMonthsAgo);

        // Delete sessions older than 2 months
        OffsetDateTime twoMonthsAgoOffset = OffsetDateTime.now().minusMonths(2);
        sessionRepository.deleteBySessionDatetimeBefore(twoMonthsAgoOffset);
        
        System.out.println("Cleanup completed for old internships and sessions.");
    }
}
