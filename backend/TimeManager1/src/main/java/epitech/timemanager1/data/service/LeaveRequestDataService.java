package epitech.timemanager1.data.service;

import epitech.timemanager1.data.dto.LeaveRequestDataDTO;
import epitech.timemanager1.entities.LeaveRequest;
import epitech.timemanager1.repositories.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveRequestDataService {

    private final LeaveRequestRepository leaveRequestRepository;

    public List<LeaveRequestDataDTO> findAll() {
        return leaveRequestRepository.findAll()
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    private LeaveRequestDataDTO toDataDTO(LeaveRequest lr) {
        return new LeaveRequestDataDTO(
                lr.getId(),
                lr.getEmployee().getId(),
                lr.getType().name(),
                lr.getStatus().name(),
                lr.getStartDate(),
                lr.getEndDate(),
                lr.getCreatedAt(),
                lr.getReason()
        );
    }
}