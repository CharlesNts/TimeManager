package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import org.mapstruct.*;

@Mapper(componentModel = "spring", imports = Role.class)
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "role", expression = "java(dto.getRole() == null ? Role.EMPLOYEE : dto.getRole())")
    User toEntity(UserDTO dto);

    @Mapping(target = "password", ignore = true) // still hide on response
    UserDTO toDTO(User entity);

    @AfterMapping
    default void ensureDefaults(@MappingTarget User entity) {
        if (entity.getRole() == null) {
            entity.setRole(Role.EMPLOYEE);
        }
    }
}