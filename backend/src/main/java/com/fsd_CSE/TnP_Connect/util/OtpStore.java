package com.fsd_CSE.TnP_Connect.util;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe, in-memory OTP store with 10-minute TTL.
 * Stores one OTP per email — any new OTP request overwrites the old one.
 */
@Component
public class OtpStore {

    private static final long OTP_TTL_MILLIS = 10 * 60 * 1000L; // 10 minutes

    private record OtpEntry(String otp, long expiryMs) {}

    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();
    private final Random random = new Random();

    /** Generate and save a 6-digit OTP for the given email. Returns the OTP. */
    public String generateAndStore(String email) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        store.put(email.toLowerCase(), new OtpEntry(otp, System.currentTimeMillis() + OTP_TTL_MILLIS));
        return otp;
    }

    /**
     * Validate the OTP for the email.
     * Returns true and removes the entry on success.
     * Returns false if missing, expired, or wrong.
     */
    public boolean validateAndConsume(String email, String otp) {
        OtpEntry entry = store.get(email.toLowerCase());
        if (entry == null) return false;
        if (System.currentTimeMillis() > entry.expiryMs()) {
            store.remove(email.toLowerCase());
            return false;
        }
        if (!entry.otp().equals(otp)) return false;
        store.remove(email.toLowerCase()); // consume — one-time use
        return true;
    }

    /** Check if there is a valid (non-expired) OTP for the email. */
    public boolean hasPending(String email) {
        OtpEntry entry = store.get(email.toLowerCase());
        if (entry == null) return false;
        if (System.currentTimeMillis() > entry.expiryMs()) {
            store.remove(email.toLowerCase());
            return false;
        }
        return true;
    }
}
