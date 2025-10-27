package com.fsd_CSE.TnP_Connect.Response.TnP_Admin_Responses;


import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class ContestSummary {
    private Integer id;
    private String title;
    private String platform;
    private OffsetDateTime startDatetime;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public OffsetDateTime getStartDatetime() {
        return startDatetime;
    }

    public void setStartDatetime(OffsetDateTime startDatetime) {
        this.startDatetime = startDatetime;
    }
}
