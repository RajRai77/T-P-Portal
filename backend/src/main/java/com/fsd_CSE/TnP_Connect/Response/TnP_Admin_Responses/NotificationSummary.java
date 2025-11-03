package com.fsd_CSE.TnP_Connect.Response.TnP_Admin_Responses;

import lombok.Data;

@Data
public class NotificationSummary {
    private Integer id;
    private String title;
    private String category;

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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
