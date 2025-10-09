package epitech.timemanager1.services;

import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TeamService {

    private final TeamRepository teams;
    private final UserRepository users;

    public TeamService(TeamRepository teams, UserRepository users) {
        this.teams = teams;
        this.users = users;
    }

    public Team create(Team t) {
        teams.findByName(t.getName()).ifPresent(x -> { throw new ConflictException("Team name already exists: " + x.getName()); });
        return teams.save(t);
    }

    @Transactional(readOnly = true)
    public Team get(long id) {
        return teams.findById(id)
                .orElseThrow(() -> new NotFoundException("Team not found: " + id));
    }

    public Team update(long id, Team patch) {
        Team t = get(id);
        if (patch.getName() != null && !patch.getName().equals(t.getName())) {
            teams.findByName(patch.getName()).ifPresent(x -> { throw new ConflictException("Team name already exists: " + patch.getName()); });
            t.setName(patch.getName());
        }
        if (patch.getDescription() != null) t.setDescription(patch.getDescription());
        if (patch.getManager() != null) t.setManager(patch.getManager());
        return t;
    }

    public Team assignManager(long teamId, long userId) {
        Team team = get(teamId);
        User manager = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        team.setManager(manager);
        return team;
    }

    public void delete(long id) {
        teams.delete(get(id));
    }

    @Transactional(readOnly = true)
    public List<Team> findByManager(long managerId) {
        return teams.findByManagerId(managerId);
    }
}