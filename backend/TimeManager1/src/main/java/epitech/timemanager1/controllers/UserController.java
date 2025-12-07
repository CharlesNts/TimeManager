package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * REST controller for managing application users.
 * <p>
 * Provides endpoints for creating, retrieving, updating, and deleting users.
 * Includes restricted endpoints for CEOs to approve or reject pending user accounts.
 * </p>
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    /** Service responsible for user management and business logic. */
    private final UserService userService;

    /**
     * Creates a new user.
     *
     * @param dto user data transfer object containing the information to create
     * @return the created {@link UserDTO} with a Location header and HTTP 201 status
     */
    @PostMapping
    public ResponseEntity<UserDTO> create(@Valid @RequestBody UserDTO dto) {
        UserDTO created = userService.create(dto);
        return ResponseEntity.created(URI.create("/api/users/" + created.getId()))
                .body(created);
    }

    /**
     * Retrieves a user by their unique ID.
     *
     * @param id the ID of the user to retrieve
     * @return the {@link UserDTO} of the requested user
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(userService.get(id));
    }

    /**
     * Lists all users in the system.
     *
     * @return a list of {@link UserDTO} representing all users
     */
    @GetMapping
    public ResponseEntity<List<UserDTO>> list() {
        return ResponseEntity.ok(userService.list());
    }

    /**
     * Updates an existing user's information.
     *
     * @param id  the ID of the user to update
     * @param dto the updated user data
     * @return the updated {@link UserDTO}
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> update(@PathVariable Long id, @Valid @RequestBody UserDTO dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    /**
     * Deletes a user by their ID.
     *
     * @param id the ID of the user to delete
     * @return {@code 204 No Content} after successful deletion
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Approves a user account. Accessible only by users with the CEO role.
     *
     * @param id the ID of the user to approve
     * @return {@code 200 OK} upon successful approval
     */
    @PreAuthorize("hasRole('CEO')")
    @PutMapping("/{id}/approve")
    public ResponseEntity<Void> approveUser(@PathVariable Long id) {
        userService.approveUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Rejects a user account. Accessible only by users with the CEO role.
     *
     * @param id the ID of the user to reject
     * @return {@code 200 OK} upon successful rejection
     */
    @PreAuthorize("hasRole('CEO')")
    @PutMapping("/{id}/reject")
    public ResponseEntity<Void> rejectUser(@PathVariable Long id) {
        userService.rejectUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Lists all users whose accounts are pending approval.
     * Accessible only by users with the CEO role.
     *
     * @return list of pending {@link UserDTO} accounts
     */
    @PreAuthorize("hasRole('CEO')")
    @GetMapping("/pending")
    public ResponseEntity<List<UserDTO>> listPendingUsers() {
        List<UserDTO> pending = userService.findAllPending();
        return ResponseEntity.ok(pending);
    }
}