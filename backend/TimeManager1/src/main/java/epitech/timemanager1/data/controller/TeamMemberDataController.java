package epitech.timemanager1.data.controller;

import epitech.timemanager1.data.dto.TeamMemberDataDTO;
import epitech.timemanager1.data.service.TeamMemberDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data/team-members")
public class TeamMemberDataController {

    private final TeamMemberDataService teamMemberDataService;

    @GetMapping
    public List<TeamMemberDataDTO> getAllTeamMembers() {
        return teamMemberDataService.findAll();
    }
}