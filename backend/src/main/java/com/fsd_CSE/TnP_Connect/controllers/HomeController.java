package com.fsd_CSE.TnP_Connect.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "TnP Connect API is running!";
    }
}
