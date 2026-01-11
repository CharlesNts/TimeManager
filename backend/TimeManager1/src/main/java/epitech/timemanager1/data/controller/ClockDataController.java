package epitech.timemanager1.data.controller;

import epitech.timemanager1.data.dto.ClockDataDTO;
import epitech.timemanager1.data.service.ClockDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data/clocks")
public class ClockDataController {

    private final ClockDataService clockDataService;

    @GetMapping
    public List<ClockDataDTO> getAllClocks() {
        return clockDataService.findAll();
    }
}