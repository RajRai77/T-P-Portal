package com.fsd_CSE.TnP_Connect.controllers;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.FileNotFoundException;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.FileStorageException;
import com.fsd_CSE.TnP_Connect.config.FileStorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Objects;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);
    
    private final Path rootLocation;

    @Autowired
    public FileController(FileStorageProperties properties) {
        this.rootLocation = Paths.get(properties.getUploadDir()).toAbsolutePath().normalize();
    }


    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
            
            Files.createDirectories(rootLocation.resolve("profilePic"));
            Files.createDirectories(rootLocation.resolve("notes"));
            Files.createDirectories(rootLocation.resolve("resources"));
            Files.createDirectories(rootLocation.resolve("resumes"));
            log.info("Initialized file storage directories at: {}", rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize storage", e);
            throw new FileStorageException("Could not initialize storage", e);
        }
    }

    //   1: Upload File 
    @PostMapping(value = "/upload/{subDirectory}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadFile(

            @RequestPart("file") MultipartFile file,
            @PathVariable String subDirectory) {

        log.info("Receiving file upload for directory: {}", subDirectory);

        String fileUrl = storeFile(file, subDirectory);
        return ResponseEntity.ok(Map.of("url", fileUrl));
    }

    //   2: Serve File 
    @GetMapping("/files/{subDirectory}/{filename:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable String subDirectory,
            @PathVariable String filename) {

        Resource file = loadFileAsResource(filename, subDirectory);


        String contentType = null;
        try {
            contentType = Files.probeContentType(file.getFile().toPath());
        } catch (IOException e) {
            log.warn("Could not determine file type for: {}", filename);
        }

        if(contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                .body(file);
    }

    private String storeFile(MultipartFile file, String subDirectory) {
        try {
            if (file.isEmpty()) {
                throw new FileStorageException("Failed to store empty file.");
            }


            String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));

            String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9\\._-]", "_");


            String uniqueFilename = UUID.randomUUID().toString() + "_" + sanitizedFilename;


            Path subDirPath = rootLocation.resolve(subDirectory).normalize();
            if (!subDirPath.startsWith(rootLocation)) {
                throw new FileStorageException("Cannot store file outside current directory.");
            }
            Path targetLocation = subDirPath.resolve(uniqueFilename);


            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
                log.info("Stored file at: {}", targetLocation);
            }

            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/files/")
                    .path(subDirectory)
                    .path("/")
                    .path(uniqueFilename)
                    .toUriString();

        } catch (IOException e) {
            log.error("Failed to store file", e);
            throw new FileStorageException("Failed to store file.", e);
        }
    }

    private Resource loadFileAsResource(String filename, String subDirectory) {
        try {
            Path file = rootLocation.resolve(subDirectory).resolve(filename).normalize();
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                log.warn("Could not read file: {}", filename);
                throw new FileNotFoundException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            log.error("Malformed URL for file: {}", filename, e);
            throw new FileNotFoundException("Could not read file: " + filename, e);
        }
    }
}
