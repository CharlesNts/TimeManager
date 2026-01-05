package epitech.timemanager1.data.controller;

import epitech.timemanager1.data.dto.LeaveRequestDataDTO;
import epitech.timemanager1.data.service.LeaveRequestDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data/leave-requests")
public class LeaveRequestDataController {

    private final LeaveRequestDataService leaveRequestDataService;

    @GetMapping
    public List<LeaveRequestDataDTO> getAllLeaveRequests() {
        return leaveRequestDataService.findAll();
    }
}