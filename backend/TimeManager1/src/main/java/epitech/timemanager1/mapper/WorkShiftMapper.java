package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.WorkShiftDTO;
import epitech.timemanager1.entities.WorkShift;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface WorkShiftMapper {

    @Mapping(source = "team.id",      target = "teamId")
    @Mapping(source = "team.name",    target = "teamName")
    @Mapping(source = "employee.id",  target = "employeeId")
    // If your DTO field is `note`, keep this. If it's `notes`, change target = "notes"
    @Mapping(source = "note",         target = "note")
    // Build "First Last" or null if unassigned:
    @Mapping(target = "employeeName",
            expression = "java(ws.getEmployee() != null ? ws.getEmployee().getFirstName() + \" \" + ws.getEmployee().getLastName() : null)")
    WorkShiftDTO toDto(WorkShift ws);

    List<WorkShiftDTO> toDtoList(List<WorkShift> list);
}