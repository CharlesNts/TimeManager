package epitech.timemanager1.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ScheduleTemplateDTO {
    private Long id;
    private Long teamId;
    private String teamName;
    private String name;
    private boolean active;
    private String weeklyPatternJson; // optional
}