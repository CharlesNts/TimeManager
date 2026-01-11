package epitech.timemanager1.data.service;

import epitech.timemanager1.data.dto.TeamMemberDataDTO;
import epitech.timemanager1.entities.TeamMember;
import epitech.timemanager1.repositories.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamMemberDataService {

    private final TeamMemberRepository teamMemberRepository;

    public List<TeamMemberDataDTO> findAll() {
        return teamMemberRepository.findAll()
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    private TeamMemberDataDTO toDataDTO(TeamMember tm) {
        return new TeamMemberDataDTO(
                tm.getId().getUserId(),
                tm.getId().getTeamId(),
                tm.getJoinedAt()
        );
    }
}