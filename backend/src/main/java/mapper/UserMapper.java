package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    @Mapping(target = "id", ignore = true)
    User toEntity(UserDTO dto);

    UserDTO toDTO(User entity);
}