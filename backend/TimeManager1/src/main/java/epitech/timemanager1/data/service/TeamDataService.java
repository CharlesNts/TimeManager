package epitech.timemanager1.data.service;

import epitech.timemanager1.data.dto.TeamDataDTO;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.repositories.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamDataService {

    private final TeamRepository teamRepository;

    public List<TeamDataDTO> findAll() {
        return teamRepository.findAll()
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    private TeamDataDTO toDataDTO(Team team) {
        return new TeamDataDTO(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getManager() != null ? team.getManager().getId() : null,
                team.getCreatedAt()
        );
    }
}