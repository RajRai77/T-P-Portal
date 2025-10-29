package com.fsd_CSE.TnP_Connect.Response.TnP_Admin_Responses;

import lombok.Data;

@Data
public class ResourceSummary {
    private Integer id;
    private String title;
    private String type;

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
