package com.nexusaid.admin.client;

import com.nexusaid.admin.security.User;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;
import java.util.UUID;
import java.util.Collections;

@FeignClient(name = "core-service", url = "${core.service.url}")
public interface CoreServiceFeignClient {

    @GetMapping("/api/v1/management/committees/hierarchy/overview")
    @CircuitBreaker(name = "coreService", fallbackMethod = "fallbackHierarchy")
    @Retry(name = "coreService")
    String getHierarchyOverview(@RequestHeader("Authorization") String authHeader);

    @GetMapping("/api/v1/profiles/me")
    @CircuitBreaker(name = "coreService", fallbackMethod = "fallbackProfile")
    @Retry(name = "coreService")
    String getMyProfile(@RequestHeader("Authorization") String authHeader);

    @GetMapping("/api/v1/profiles/me/assignable-users")
    @CircuitBreaker(name = "coreService", fallbackMethod = "fallbackAssignableUsers")
    @Retry(name = "coreService")
    String getAssignableUsers(@RequestHeader("Authorization") String authHeader);

    default String fallbackHierarchy(String authHeader, Throwable t) {
        throw new RuntimeException("Core-service is temporarily unavailable. Please retry.", t);
    }

    default String fallbackProfile(String authHeader, Throwable t) {
        throw new RuntimeException("Core-service is temporarily unavailable. Please retry.", t);
    }

    default String fallbackAssignableUsers(String authHeader, Throwable t) {
        throw new RuntimeException("Failed to fetch assignable users. Core-service unavailable.", t);
    }
}
