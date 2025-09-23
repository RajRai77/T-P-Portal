package com.fsd_CSE.TnP_Connect.Repository;

import com.fsd_CSE.TnP_Connect.Enitities.InternshipApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface InternshipApplicationRepository extends JpaRepository<InternshipApplication, Integer> {

    Optional<InternshipApplication> findByStudentIdAndInternshipId(Integer studentId, Integer internshipId);
    List<InternshipApplication> findByInternshipId(Integer internshipId);

}