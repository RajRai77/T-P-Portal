package com.fsd_CSE.TnP_Connect;

import com.fsd_CSE.TnP_Connect.config.FileStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(FileStorageProperties.class)
@EnableScheduling
public class TnPConnectApplication {

	public static void main(String[] args) {
		SpringApplication.run(TnPConnectApplication.class, args);
	}

}

