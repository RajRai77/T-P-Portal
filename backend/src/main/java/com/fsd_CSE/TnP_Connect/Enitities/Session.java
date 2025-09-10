package com.fsd_CSE.TnP_Connect.Enitities;


import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String speaker;

    @Column(name = "target_branch")
    private String targetBranch;

    @Column(name = "target_year")
    private Integer targetYear;

    @Column(name = "session_datetime", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime sessionDatetime;

    @Column(name = "join_url")
    private String joinUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime createdAt;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_admin_id", referencedColumnName = "admin_id")
    private TnPAdmin createdByAdmin;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SessionRegistration> registrations;


    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSpeaker() { return speaker; }
    public void setSpeaker(String speaker) { this.speaker = speaker; }
    public String getTargetBranch() { return targetBranch; }
    public void setTargetBranch(String targetBranch) { this.targetBranch = targetBranch; }
    public Integer getTargetYear() { return targetYear; }
    public void setTargetYear(Integer targetYear) { this.targetYear = targetYear; }
    public OffsetDateTime getSessionDatetime() { return sessionDatetime; }
    public void setSessionDatetime(OffsetDateTime sessionDatetime) { this.sessionDatetime = sessionDatetime; }
    public String getJoinUrl() { return joinUrl; }
    public void setJoinUrl(String joinUrl) { this.joinUrl = joinUrl; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public TnPAdmin getCreatedByAdmin() { return createdByAdmin; }
    public void setCreatedByAdmin(TnPAdmin createdByAdmin) { this.createdByAdmin = createdByAdmin; }
    public List<SessionRegistration> getRegistrations() { return registrations; }
    public void setRegistrations(List<SessionRegistration> registrations) { this.registrations = registrations; }
}