package com.fsd_CSE.TnP_Connect.Repository;

import com.fsd_CSE.TnP_Connect.Enitities.TnPAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TnPAdminRepository extends JpaRepository<TnPAdmin, Integer> {

    Optional<TnPAdmin> findByEmail(String email);
}

