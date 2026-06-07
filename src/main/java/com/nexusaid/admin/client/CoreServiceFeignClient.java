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

    @GetMapping("/api/v1/management/committees/my-accessible")
    @CircuitBreaker(name = "coreService", fallbackMethod = "fallbackList")
    @Retry(name = "coreService")
    List<UUID> getMyAccessibleCommitteeIds(@RequestHeader("Authorization") String authHeader);

    @GetMapping("/api/v1/management/committees/{id}/presidents")
    @CircuitBreaker(name = "coreService", fallbackMethod = "fallbackUserList")
    @Retry(name = "coreService")
    List<User> getCommitteePresidents(@PathVariable("id") UUID committeeId, @RequestHeader("Authorization") String authHeader);

    default String fallbackHierarchy(String authHeader, Throwable t) {
        throw new RuntimeException("Core-service is temporarily unavailable. Please retry.", t);
    }

    default String fallbackProfile(String authHeader, Throwable t) {
        throw new RuntimeException("Core-service is temporarily unavailable. Please retry.", t);
    }

    default List<UUID> fallbackList(String authHeader, Throwable t) {
        return Collections.emptyList();
    }

    default List<User> fallbackUserList(UUID committeeId, String authHeader, Throwable t) {
        return Collections.emptyList();
    }
}
