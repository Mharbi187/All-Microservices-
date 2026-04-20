package com.nexusaid.admin.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ configuration for admin-service (MS3).
 *
 * Event catalog (CDC — Change Data Capture):
 * PRODUCES:
 * - donation.received → MS1 auto-updates inventory stock
 * - report.published → MS1 broadcasts to committee volunteers
 * CONSUMES:
 * - intervention.created → create SitRep draft prompt
 * - intervention.closed → archive workflow
 * - stock.alert → log alert in reports
 * - volunteer.registered → create welcome notification
 * - volunteer.role.assigned → audit log entry
 * - disaster.alert → create urgent admin notification
 *
 * All queues have Dead-Letter Exchange (DLX) for poison-message handling.
 */
@Configuration
public class RabbitMQConfig {

    // ── Shared Exchange ──────────────────────────────────────
    public static final String NEXUSAID_EXCHANGE = "nexusaid.exchange";
    public static final String DLX_EXCHANGE = "nexusaid.dlx";

    // ── Queues consumed by MS3 ───────────────────────────────
    public static final String INTERVENTION_ALERTS_QUEUE = "nexusaid.intervention.alerts";
    public static final String STOCK_ALERTS_QUEUE = "nexusaid.stock.alerts";
    public static final String DISASTER_ALERTS_QUEUE = "nexusaid.disaster.alerts";
    public static final String VOLUNTEER_EVENTS_QUEUE = "nexusaid.volunteer.events";

    // ── Queues produced by MS3 ───────────────────────────────
    public static final String DONATION_EVENTS_QUEUE = "nexusaid.donation.events";
    public static final String REPORT_PUBLISHED_QUEUE = "nexusaid.report.published";

    // ── DLQ ──────────────────────────────────────────────────
    public static final String DLQ_QUEUE = "nexusaid.dlq";

    // ── Routing Keys ─────────────────────────────────────────
    public static final String INTERVENTION_CREATED_KEY = "intervention.created";
    public static final String INTERVENTION_CLOSED_KEY = "intervention.closed";
    public static final String STOCK_ROUTING_KEY = "stock.alert";
    public static final String DISASTER_ROUTING_KEY = "disaster.alert";
    public static final String VOLUNTEER_REGISTERED_KEY = "volunteer.registered";
    public static final String VOLUNTEER_ROLE_ASSIGNED_KEY = "volunteer.role.assigned";
    public static final String DONATION_RECEIVED_KEY = "donation.received";
    public static final String REPORT_PUBLISHED_KEY = "report.published";

    // ── Exchanges ────────────────────────────────────────────

    @Bean
    public TopicExchange nexusaidExchange() {
        return new TopicExchange(NEXUSAID_EXCHANGE);
    }

    @Bean
    public FanoutExchange deadLetterExchange() {
        return new FanoutExchange(DLX_EXCHANGE);
    }

    // ── DLQ ──────────────────────────────────────────────────

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ_QUEUE).build();
    }

    @Bean
    public Binding dlqBinding(Queue deadLetterQueue, FanoutExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange);
    }

    // ── Consumer Queues (MS1/MS4 → MS3) ─────────────────────

    @Bean
    public Queue interventionAlertsQueue() {
        return QueueBuilder.durable(INTERVENTION_ALERTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue stockAlertsQueue() {
        return QueueBuilder.durable(STOCK_ALERTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue disasterAlertsQueue() {
        return QueueBuilder.durable(DISASTER_ALERTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue volunteerEventsQueue() {
        return QueueBuilder.durable(VOLUNTEER_EVENTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    // ── Producer Queues (MS3 → MS1) ─────────────────────────

    @Bean
    public Queue donationEventsQueue() {
        return QueueBuilder.durable(DONATION_EVENTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue reportPublishedQueue() {
        return QueueBuilder.durable(REPORT_PUBLISHED_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    // ── Bindings ─────────────────────────────────────────────

    @Bean
    public Binding interventionCreatedBinding(Queue interventionAlertsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(interventionAlertsQueue).to(nexusaidExchange).with(INTERVENTION_CREATED_KEY);
    }

    @Bean
    public Binding interventionClosedBinding(Queue interventionAlertsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(interventionAlertsQueue).to(nexusaidExchange).with(INTERVENTION_CLOSED_KEY);
    }

    @Bean
    public Binding stockBinding(Queue stockAlertsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(stockAlertsQueue).to(nexusaidExchange).with(STOCK_ROUTING_KEY);
    }

    @Bean
    public Binding disasterBinding(Queue disasterAlertsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(disasterAlertsQueue).to(nexusaidExchange).with(DISASTER_ROUTING_KEY);
    }

    @Bean
    public Binding volunteerRegisteredBinding(Queue volunteerEventsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(volunteerEventsQueue).to(nexusaidExchange).with(VOLUNTEER_REGISTERED_KEY);
    }

    @Bean
    public Binding volunteerRoleBinding(Queue volunteerEventsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(volunteerEventsQueue).to(nexusaidExchange).with(VOLUNTEER_ROLE_ASSIGNED_KEY);
    }

    @Bean
    public Binding donationBinding(Queue donationEventsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(donationEventsQueue).to(nexusaidExchange).with(DONATION_RECEIVED_KEY);
    }

    @Bean
    public Binding reportPublishedBinding(Queue reportPublishedQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(reportPublishedQueue).to(nexusaidExchange).with(REPORT_PUBLISHED_KEY);
    }

    // ── Serialization ────────────────────────────────────────

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
