package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.TeamDTO;
import epitech.timemanager1.entities.Team;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeamMapper {
    @Mapping(target = "manager", ignore = true)   // <— important
    Team toEntity(TeamDTO dto);

    TeamDTO toDTO(Team entity);
    List<TeamDTO> toDTOs(List<Team> entities);
}