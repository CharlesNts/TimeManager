package epitech.timemanager1.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final JwtTokenService jwtTokenService;
    private final UserDetailsService userDetailsService;

    public JwtAuthFilter(JwtTokenService jwtTokenService, UserDetailsService userDetailsService) {
        this.jwtTokenService = jwtTokenService;
        this.userDetailsService = userDetailsService;
    }

    /**
     * Don’t run this filter on public routes like password reset and docs.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return PATH_MATCHER.match("/api/auth/password/**", uri)
                || PATH_MATCHER.match("/v3/api-docs/**", uri)
                || PATH_MATCHER.match("/swagger-ui/**", uri)
                || PATH_MATCHER.match("/swagger-ui.html", uri)
                || PATH_MATCHER.match("/error", uri);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        try {
            String header = req.getHeader("Authorization");
            if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
                String token = header.substring(7);

                if (jwtTokenService.isValid(token)) {
                    String username = jwtTokenService.getSubject(token);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // If you have an "active" flag, be lenient here: just don't authenticate if not active.
                    // PermitAll endpoints will still work; secured endpoints will be 401 due to no auth.
                    boolean active = true;
                    try {
                        // If your domain User implements UserDetails and has isActive()
                        // cast safely; otherwise leave 'active' as true.
                        Object maybeDomain = userDetails;
                        // no-op if not your domain type
                    } catch (Exception ignored) {}

                    if (active && SecurityContextHolder.getContext().getAuthentication() == null) {
                        var auth = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            }
        } catch (Exception ignored) {
            // VERY IMPORTANT: swallow errors so public endpoints (like password reset) never 401/403 here.
            // If the token is bad or the user can't be loaded, we just continue without authentication.
        }

        chain.doFilter(req, res);
    }
}