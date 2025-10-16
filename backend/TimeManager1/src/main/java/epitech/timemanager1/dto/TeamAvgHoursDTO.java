package epitech.timemanager1.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamAvgHoursDTO {
    private Long teamId;
    private String teamName;
    private double avgHours;
}