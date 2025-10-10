package epitech.timemanager1.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @Builder
public class ReportsDTO {
    private List<TeamAvgHoursDTO> teamAvgHoursWeek;
    private double latenessRateMonth; // 0..1
}
