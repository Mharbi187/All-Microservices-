package com.nexusaid.core.controller;

import com.nexusaid.core.dto.CalendarEventCreateDTO;
import com.nexusaid.core.dto.CalendarEventDTO;
import com.nexusaid.core.service.CalendarEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class CalendarEventController {

    private final CalendarEventService eventService;

    @GetMapping
    public ResponseEntity<List<CalendarEventDTO>> getUpcomingEvents() {
        return ResponseEntity.ok(eventService.getUpcomingEvents());
    }

    @PostMapping
    public ResponseEntity<CalendarEventDTO> createEvent(@RequestBody CalendarEventCreateDTO createDTO) {
        return ResponseEntity.ok(eventService.createEvent(createDTO));
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<CalendarEventDTO> registerForEvent(@PathVariable UUID id) {
        return ResponseEntity.ok(eventService.registerForEvent(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
