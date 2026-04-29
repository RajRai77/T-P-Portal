package com.fsd_CSE.TnP_Connect.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
@Profile("prod")
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DATABASE_URL}")
    private String rawDatabaseUrl;

    @Value("${DB_USERNAME}")
    private String dbUsername;

    @Value("${DB_PASSWORD}")
    private String dbPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String jdbcUrl = convertToJdbcUrl(rawDatabaseUrl);
        log.info("Connecting to database: {}", jdbcUrl.replaceAll(":[^:@]+@", ":***@"));

        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl);
        ds.setUsername(dbUsername);
        ds.setPassword(dbPassword);
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setMaximumPoolSize(5);
        ds.setConnectionTimeout(30000);
        return ds;
    }

    private String convertToJdbcUrl(String url) {
        if (url == null) throw new IllegalArgumentException("DATABASE_URL environment variable is not set");
        if (url.startsWith("jdbc:")) return url;
        return url
            .replaceFirst("^postgres://", "jdbc:postgresql://")
            .replaceFirst("^postgresql://", "jdbc:postgresql://");
    }
}
