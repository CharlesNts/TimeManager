package epitech.timemanager1.data.controller;

import epitech.timemanager1.data.dto.ClockPauseDataDTO;
import epitech.timemanager1.data.service.ClockPauseDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data/clock-pauses")
public class ClockPauseDataController {

    private final ClockPauseDataService clockPauseDataService;

    @GetMapping
    public List<ClockPauseDataDTO> getAllClockPauses() {
        return clockPauseDataService.findAll();
    }
}