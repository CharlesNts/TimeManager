package epitech.timemanager1.data.controller;

import epitech.timemanager1.data.dto.UserDataDTO;
import epitech.timemanager1.data.service.UserDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data/users")
public class UserDataController {

    private final UserDataService userDataService;

    @GetMapping
    public List<UserDataDTO> getAllUsers() {
        return userDataService.findAll();
    }
}