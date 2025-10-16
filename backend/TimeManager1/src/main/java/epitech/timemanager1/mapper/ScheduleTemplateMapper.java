package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.ScheduleTemplateDTO;
import epitech.timemanager1.entities.ScheduleTemplate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ScheduleTemplateMapper {

    @Mapping(source = "team.id", target = "teamId")
    @Mapping(source = "team.name", target = "teamName")
    ScheduleTemplateDTO toDto(ScheduleTemplate template);

    List<ScheduleTemplateDTO> toDtoList(List<ScheduleTemplate> templates);
}