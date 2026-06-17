package com.nexusaid.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.client.WebSocketClient;
import org.springframework.web.reactive.socket.server.WebSocketService;
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService;
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy;
import reactor.netty.http.client.HttpClient;

import org.springframework.context.annotation.Primary;

@Configuration
public class WebSocketConfig {

    private static final int MAX_FRAME_PAYLOAD_LENGTH = 10 * 1024 * 1024; // 10MB

    @Bean
    @Primary
    public WebSocketClient customWebSocketClient() {
        return new ReactorNettyWebSocketClient(HttpClient.create(),
                () -> reactor.netty.http.client.WebsocketClientSpec.builder()
                        .maxFramePayloadLength(MAX_FRAME_PAYLOAD_LENGTH));
    }

    @Bean
    @Primary
    public WebSocketService customWebSocketService() {
        ReactorNettyRequestUpgradeStrategy strategy = new ReactorNettyRequestUpgradeStrategy();
        strategy.setMaxFramePayloadLength(MAX_FRAME_PAYLOAD_LENGTH);
        return new HandshakeWebSocketService(strategy);
    }
}
