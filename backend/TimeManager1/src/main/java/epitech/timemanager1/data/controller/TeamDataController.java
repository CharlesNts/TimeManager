package epitech.timemanager1.data.controller;

import epitech.timemanager1.data.dto.TeamDataDTO;
import epitech.timemanager1.data.service.TeamDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data/teams")
public class TeamDataController {

    private final TeamDataService teamDataService;

    @GetMapping
    public List<TeamDataDTO> getAllTeams() {
        return teamDataService.findAll();
    }
}