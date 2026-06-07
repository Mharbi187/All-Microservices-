package com.nexusaid.core.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ configuration for core-service (MS1).
 *
 * Event catalog (CDC — Change Data Capture):
 * PRODUCES:
 * - intervention.created → MS3 creates SitRep draft
 * - intervention.closed → MS3 archives workflow
 * - stock.alert → MS3 logs alert in reports
 * - volunteer.registered → MS3 creates welcome notification
 * - volunteer.role.assigned → MS3 audit log
 * CONSUMES:
 * - donation.received → auto-update inventory (in-kind)
 * - disaster.alert → create emergency intervention
 * - report.published → broadcast to committee
 *
 * All queues have Dead-Letter Exchange (DLX) for poison-message handling.
 */
@Configuration
public class RabbitMQConfig {

    // ── Exchange ──────────────────────────────────────────────
    public static final String NEXUSAID_EXCHANGE = "nexusaid.exchange";
    public static final String DLX_EXCHANGE = "nexusaid.dlx";

    // ── Queues (produced by MS1) ─────────────────────────────
    public static final String INTERVENTION_ALERTS_QUEUE = "nexusaid.intervention.alerts";
    public static final String STOCK_ALERTS_QUEUE = "nexusaid.stock.alerts";
    public static final String VOLUNTEER_EVENTS_QUEUE = "nexusaid.volunteer.events";

    // ── Queues (consumed by MS1) ─────────────────────────────
    public static final String DISASTER_ALERTS_QUEUE = "nexusaid.disaster.alerts";
    public static final String DONATION_EVENTS_QUEUE = "nexusaid.donation.events";
    public static final String REPORT_PUBLISHED_QUEUE = "nexusaid.report.published";

    // ── Queues for Donation Workflow (consumed by MS1) ───────────
    public static final String DONATION_NEED_CREATED_QUEUE  = "nexusaid.donation.need.created";
    public static final String DONATION_NEED_VALIDATED_QUEUE = "nexusaid.donation.need.validated";
    public static final String DONATION_NEED_REJECTED_QUEUE  = "nexusaid.donation.need.rejected";
    public static final String DONATION_FISCAL_RECEIPT_QUEUE = "nexusaid.donation.fiscal.receipt";

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

    // ── Routing Keys for Donation Workflow ───────────────────────
    public static final String DONATION_NEED_CREATED_KEY   = "donation.need.created";
    public static final String DONATION_NEED_VALIDATED_KEY = "donation.need.validated";
    public static final String DONATION_NEED_REJECTED_KEY  = "donation.need.rejected";
    public static final String DONATION_FISCAL_RECEIPT_KEY = "donation.fiscal.receipt";

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

    // ── Producer Queues (MS1 → MS3) ─────────────────────────

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
    public Queue volunteerEventsQueue() {
        return QueueBuilder.durable(VOLUNTEER_EVENTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    // ── Consumer Queues (MS3/MS4 → MS1) ─────────────────────

    @Bean
    public Queue disasterAlertsQueue() {
        return QueueBuilder.durable(DISASTER_ALERTS_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

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

    @Bean
    public Queue donationNeedCreatedQueue() {
        return QueueBuilder.durable(DONATION_NEED_CREATED_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue donationNeedValidatedQueue() {
        return QueueBuilder.durable(DONATION_NEED_VALIDATED_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue donationNeedRejectedQueue() {
        return QueueBuilder.durable(DONATION_NEED_REJECTED_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue donationFiscalReceiptQueue() {
        return QueueBuilder.durable(DONATION_FISCAL_RECEIPT_QUEUE)
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
    public Binding volunteerRegisteredBinding(Queue volunteerEventsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(volunteerEventsQueue).to(nexusaidExchange).with(VOLUNTEER_REGISTERED_KEY);
    }

    @Bean
    public Binding volunteerRoleBinding(Queue volunteerEventsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(volunteerEventsQueue).to(nexusaidExchange).with(VOLUNTEER_ROLE_ASSIGNED_KEY);
    }

    @Bean
    public Binding disasterBinding(Queue disasterAlertsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(disasterAlertsQueue).to(nexusaidExchange).with(DISASTER_ROUTING_KEY);
    }

    @Bean
    public Binding donationBinding(Queue donationEventsQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(donationEventsQueue).to(nexusaidExchange).with(DONATION_RECEIVED_KEY);
    }

    @Bean
    public Binding reportPublishedBinding(Queue reportPublishedQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(reportPublishedQueue).to(nexusaidExchange).with(REPORT_PUBLISHED_KEY);
    }

    @Bean
    public Binding donationNeedCreatedBinding(Queue donationNeedCreatedQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(donationNeedCreatedQueue).to(nexusaidExchange).with(DONATION_NEED_CREATED_KEY);
    }

    @Bean
    public Binding donationNeedValidatedBinding(Queue donationNeedValidatedQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(donationNeedValidatedQueue).to(nexusaidExchange).with(DONATION_NEED_VALIDATED_KEY);
    }

    @Bean
    public Binding donationNeedRejectedBinding(Queue donationNeedRejectedQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(donationNeedRejectedQueue).to(nexusaidExchange).with(DONATION_NEED_REJECTED_KEY);
    }

    @Bean
    public Binding donationFiscalReceiptBinding(Queue donationFiscalReceiptQueue, TopicExchange nexusaidExchange) {
        return BindingBuilder.bind(donationFiscalReceiptQueue).to(nexusaidExchange).with(DONATION_FISCAL_RECEIPT_KEY);
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

        // Publisher Confirms: log when broker NACKs a message
        template.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                // Log as SEVERE — message was not accepted by broker
                System.err.println("[RABBIT] Message NACK'd by broker. Cause: " + cause
                        + ", correlationData: " + correlationData);
            }
        });

        // Publisher Returns: log when message cannot be routed to any queue
        template.setReturnsCallback(returned -> {
            System.err.println("[RABBIT] Message returned (unroutable). Exchange: "
                    + returned.getExchange() + ", routingKey: " + returned.getRoutingKey()
                    + ", replyCode: " + returned.getReplyCode()
                    + ", replyText: " + returned.getReplyText());
        });
        template.setMandatory(true);

        return template;
    }
}
