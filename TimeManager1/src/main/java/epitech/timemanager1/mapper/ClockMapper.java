package epitech.timemanager1.mapper;

import epitech.timemanager1.dto.ClockDTO;
import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClockMapper {

    // Entity -> DTO (embed minimal user info)
    @Mapping(source = "user", target = "user")
    ClockDTO toDTO(Clock entity);

    // DTO -> Entity (bind user by id if user is present)
    @Mapping(source = "user", target = "user")
    Clock toEntity(ClockDTO dto);

    List<ClockDTO> toDTOs(List<Clock> entities);

    // Helpers to bind User <-> UserDTO (id-only is fine)
    default UserDTO toUserDTO(User user) {
        if (user == null) return null;
        return UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }

    default User toUser(UserDTO dto) {
        if (dto == null || dto.getId() == null) return null;
        User u = new User();
        u.setId(dto.getId());
        return u;
    }
}