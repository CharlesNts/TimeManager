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

/**
 * Service responsible for managing {@link Team} entities and their relationships
 * with {@link User} entities (managers).
 * <p>
 * Provides operations for creating, retrieving, updating, deleting, and
 * assigning managers to teams. It also ensures data integrity and
 * prevents duplicate team names.
 * </p>
 */
@Service
@Transactional
public class TeamService {

    private final TeamRepository teams;
    private final UserRepository users;

    /**
     * Constructs a new {@link TeamService} instance with the required repositories.
     *
     * @param teams the {@link TeamRepository} for accessing team data
     * @param users the {@link UserRepository} for accessing user data
     */
    public TeamService(TeamRepository teams, UserRepository users) {
        this.teams = teams;
        this.users = users;
    }

    /**
     * Creates a new team.
     * <p>
     * Ensures the team name is unique before saving.
     * </p>
     *
     * @param t the {@link Team} entity to create
     * @return the newly created team
     * @throws ConflictException if a team with the same name already exists
     */
    public Team create(Team t) {
        teams.findByName(t.getName()).ifPresent(x -> {
            throw new ConflictException("Team name already exists: " + x.getName());
        });
        return teams.save(t);
    }

    /**
     * Retrieves a team by its ID.
     *
     * @param id the team ID
     * @return the {@link Team} entity
     * @throws NotFoundException if no team is found with the given ID
     */
    @Transactional(readOnly = true)
    public Team get(long id) {
        return teams.findById(id)
                .orElseThrow(() -> new NotFoundException("Team not found: " + id));
    }

    /**
     * Updates an existing team’s information.
     * <p>
     * Supports partial updates — only non-null fields from the provided
     * {@code patch} object will overwrite the existing values.
     * </p>
     *
     * @param id    the ID of the team to update
     * @param patch a {@link Team} object containing the new data
     * @return the updated {@link Team} entity
     * @throws ConflictException if the new name already exists in another team
     */
    public Team update(long id, Team patch) {
        Team t = get(id);
        if (patch.getName() != null && !patch.getName().equals(t.getName())) {
            teams.findByName(patch.getName()).ifPresent(x -> {
                throw new ConflictException("Team name already exists: " + patch.getName());
            });
            t.setName(patch.getName());
        }
        if (patch.getDescription() != null) t.setDescription(patch.getDescription());
        if (patch.getManager() != null) t.setManager(patch.getManager());
        return t;
    }

    /**
     * Assigns a manager to a team.
     *
     * @param teamId the ID of the team
     * @param userId the ID of the user to assign as manager
     * @return the updated {@link Team} entity
     * @throws NotFoundException if the team or user does not exist
     */
    public Team assignManager(long teamId, long userId) {
        Team team = get(teamId);
        User manager = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        team.setManager(manager);
        return team;
    }

    /**
     * Deletes a team by its ID.
     *
     * @param id the ID of the team to delete
     * @throws NotFoundException if no team exists with the given ID
     */
    public void delete(long id) {
        teams.delete(get(id));
    }

    /**
     * Finds all teams managed by a specific user.
     *
     * @param managerId the ID of the manager
     * @return a list of {@link Team} entities managed by the given user
     */
    @Transactional(readOnly = true)
    public List<Team> findByManager(long managerId) {
        return teams.findByManagerId(managerId);
    }
}