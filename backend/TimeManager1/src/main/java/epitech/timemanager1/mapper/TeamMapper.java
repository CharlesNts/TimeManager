package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.TeamDTO;
import epitech.timemanager1.entities.Team;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring", uses = { UserMapper.class })
public interface TeamMapper {
    TeamDTO toDTO(Team entity);
    Team toEntity(TeamDTO dto);
    List<TeamDTO> toDTOs(List<Team> entities);
}