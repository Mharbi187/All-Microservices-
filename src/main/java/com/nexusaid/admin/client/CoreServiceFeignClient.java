package com.nexusaid.admin.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;

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

    default String fallbackHierarchy(String authHeader, Throwable t) {
        throw new RuntimeException("Core-service is temporarily unavailable. Please retry.", t);
    }

    default String fallbackProfile(String authHeader, Throwable t) {
        throw new RuntimeException("Core-service is temporarily unavailable. Please retry.", t);
    }
}
