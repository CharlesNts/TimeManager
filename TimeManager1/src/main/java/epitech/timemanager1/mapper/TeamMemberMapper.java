package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.TeamMemberDTO;
import epitech.timemanager1.entities.TeamMember;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", uses = { UserMapper.class, TeamMapper.class })
public interface TeamMemberMapper {

    TeamMemberDTO toDTO(TeamMember entity);

    TeamMember toEntity(TeamMemberDTO dto);

    List<TeamMemberDTO> toDTOs(List<TeamMember> entities);

    @AfterMapping
    default void fillId(@MappingTarget TeamMember entity) {
        if (entity == null) return;
        if (entity.getId() == null) {
            entity.setId(new TeamMember.Id());
        }
        if (entity.getUser() != null) {
            entity.getId().setUserId(entity.getUser().getId());
        }
        if (entity.getTeam() != null) {
            entity.getId().setTeamId(entity.getTeam().getId());
        }
    }
}