package com.fsd_CSE.TnP_Connect.Enitities;


import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "target_branch")
    private String targetBranch;

    @Column(name = "target_year")
    private Integer targetYear;

    private String link;

    @Column(name = "event_date")
    private LocalDate eventDate;
    private String category;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime createdAt;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by_admin_id", referencedColumnName = "admin_id")
    private TnPAdmin postedByAdmin;


    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getTargetBranch() { return targetBranch; }
    public void setTargetBranch(String targetBranch) { this.targetBranch = targetBranch; }
    public Integer getTargetYear() { return targetYear; }
    public void setTargetYear(Integer targetYear) { this.targetYear = targetYear; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public TnPAdmin getPostedByAdmin() { return postedByAdmin; }
    public void setPostedByAdmin(TnPAdmin postedByAdmin) { this.postedByAdmin = postedByAdmin; }
}