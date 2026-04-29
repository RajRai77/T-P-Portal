package com.fsd_CSE.TnP_Connect.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Profile("prod")
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DATABASE_URL}")
    private String rawDatabaseUrl;

    @Bean
    @Primary
    public DataSource dataSource() throws Exception {
        // Render provides: postgres://username:password@host/dbname (no port)
        // We need:         jdbc:postgresql://host:5432/dbname  + separate user/pass
        URI uri = new URI(rawDatabaseUrl.replace("postgres://", "http://")
                                        .replace("postgresql://", "http://"));

        String host     = uri.getHost();
        int    port     = uri.getPort() == -1 ? 5432 : uri.getPort();
        String db       = uri.getPath().substring(1); // remove leading "/"
        String userInfo = uri.getUserInfo();
        String user     = userInfo.split(":")[0];
        String pass     = userInfo.substring(userInfo.indexOf(':') + 1);

        String jdbcUrl  = "jdbc:postgresql://" + host + ":" + port + "/" + db;
        log.info("Connecting to database: jdbc:postgresql://{}:{}/{}", host, port, db);

        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl);
        ds.setUsername(user);
        ds.setPassword(pass);
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setMaximumPoolSize(5);
        ds.setConnectionTimeout(30000);
        return ds;
    }
}
