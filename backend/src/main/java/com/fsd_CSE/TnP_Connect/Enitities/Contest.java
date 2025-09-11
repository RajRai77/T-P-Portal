package com.fsd_CSE.TnP_Connect.Enitities;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "contests")
public class Contest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String platform;

    @Column(name = "contest_url", nullable = false)
    private String contestUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_datetime", nullable = false)
    private OffsetDateTime startDatetime;

    @Column(name = "end_datetime", nullable = false)
    private OffsetDateTime endDatetime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_admin_id")
    private TnPAdmin createdByAdmin;


    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getContestUrl() { return contestUrl; }
    public void setContestUrl(String contestUrl) { this.contestUrl = contestUrl; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getStartDatetime() { return startDatetime; }
    public void setStartDatetime(OffsetDateTime startDatetime) { this.startDatetime = startDatetime; }
    public OffsetDateTime getEndDatetime() { return endDatetime; }
    public void setEndDatetime(OffsetDateTime endDatetime) { this.endDatetime = endDatetime; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public TnPAdmin getCreatedByAdmin() { return createdByAdmin; }
    public void setCreatedByAdmin(TnPAdmin createdByAdmin) { this.createdByAdmin = createdByAdmin; }
}