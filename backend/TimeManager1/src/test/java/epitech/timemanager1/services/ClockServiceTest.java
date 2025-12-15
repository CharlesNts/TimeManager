package epitech.timemanager1.services;

import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.ClockRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClockServiceTest {

    @Mock ClockRepository clockRepo;
    @Mock UserRepository userRepo;

    @InjectMocks ClockService service;

    User user;

    @BeforeEach
    void setup() {
        user = User.builder().id(1L).email("a@b.c").firstName("A").lastName("B").password("x").active(true).build();
    }

    @Test
    void clockIn_ok_when_no_active_session() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(clockRepo.findTopByUserOrderByClockInDesc(user)).thenReturn(Optional.empty());
        when(clockRepo.save(any(Clock.class))).thenAnswer(inv -> {
            Clock c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });

        Clock saved = service.clockIn(1L, null);

        assertNotNull(saved.getId());
        assertEquals(user, saved.getUser());
        assertNotNull(saved.getClockIn());
        verify(clockRepo).save(any(Clock.class));
    }

    @Test
    void clockIn_conflict_when_already_clocked_in() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        Clock last = Clock.builder().id(7L).user(user).clockIn(LocalDateTime.now()).clockOut(null).build();
        when(clockRepo.findTopByUserOrderByClockInDesc(user)).thenReturn(Optional.of(last));

        assertThrows(ConflictException.class, () -> service.clockIn(1L, null));
        verify(clockRepo, never()).save(any());
    }

    @Test
    void clockOut_ok_when_active_session_exists() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        Clock last = Clock.builder().id(7L).user(user).clockIn(LocalDateTime.now().minusHours(2)).clockOut(null).build();
        when(clockRepo.findTopByUserOrderByClockInDesc(user)).thenReturn(Optional.of(last));

        Clock out = service.clockOut(1L, null);

        assertNotNull(out.getClockOut());
        assertEquals(last, out);
    }

    @Test
    void clockOut_conflict_when_no_active_session() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(clockRepo.findTopByUserOrderByClockInDesc(user)).thenReturn(Optional.empty());

        assertThrows(ConflictException.class, () -> service.clockOut(1L, null));
    }

    @Test
    void listForUser_ok() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        Pageable pageable = PageRequest.of(0, 20);
        Page<Clock> page = new PageImpl<>(List.of(
                Clock.builder().id(1L).user(user).clockIn(LocalDateTime.now()).build()
        ));
        when(clockRepo.findByUser(user, pageable)).thenReturn(page);

        Page<Clock> result = service.listForUser(1L, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void listForUser_user_not_found() {
        when(userRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.listForUser(1L, PageRequest.of(0, 10)));
    }

    @Test
    void listForUserBetween_ok() {
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now();
        when(clockRepo.findByUserIdAndClockInBetween(1L, from, to)).thenReturn(List.of(new Clock()));

        var list = service.listForUserBetween(1L, from, to);
        assertEquals(1, list.size());
    }
}