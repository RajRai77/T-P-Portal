package com.fsd_CSE.TnP_Connect.controllers;

import com.fsd_CSE.TnP_Connect.util.CloudinaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    @Autowired
    private CloudinaryService cloudinaryService;

    @PostMapping(value = "/upload/{subDirectory}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestPart("file") MultipartFile file,
            @PathVariable String subDirectory) {

        log.info("Uploading file to Cloudinary folder: {}", subDirectory);
        try {
            String url = cloudinaryService.uploadFile(file, subDirectory);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            log.error("Cloudinary upload failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }
}
