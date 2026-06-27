using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    // ILogger integrates with any logging provider (e.g. Application Insights, Seq, Sentry) without code changes.
    private readonly ILogger<AuthController> _logger;
    private readonly bool _isProduction;

    public AuthController(AppDbContext db, IConfiguration config, IWebHostEnvironment env, ILogger<AuthController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
        _isProduction = env.IsProduction();
    }

    // Secure is true in production (requires HTTPS) and false in development to allow local HTTP.
    private CookieOptions RefreshCookieOptions => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Strict,
        Secure = _isProduction,
        MaxAge = TimeSpan.FromDays(7)
    };

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Username and password are required." });

        if (dto.Username.Length > 50)
            return BadRequest(new { message = "Username must be 50 characters or fewer." });

        if (dto.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        if (dto.Password.Length > 100)
            return BadRequest(new { message = "Password must be 100 characters or fewer." });

        if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
            return BadRequest(new { message = "Username already taken." });

        var user = new User
        {
            Username = dto.Username,
            // Work factor 12 is the OWASP recommended minimum for new systems; each increment doubles hashing time.
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User registered: {Username}", dto.Username);
        return Ok(new { message = "User registered successfully." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == dto.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for username: {Username}", dto.Username);
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var accessToken = GenerateJwt(user);
        await SetRefreshTokenCookie(user.Id);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User logged in: {Username}", dto.Username);
        return Ok(new { token = accessToken });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (rawToken == null)
            return Unauthorized(new { message = "No refresh token provided." });

        var tokenHash = Hash(rawToken);
        var stored = await _db.RefreshTokens
            .Include(r => r.User)
            .SingleOrDefaultAsync(r => r.TokenHash == tokenHash);

        if (stored == null || stored.IsRevoked || stored.ExpiresAt < DateTime.UtcNow)
        {
            _logger.LogWarning("Invalid or expired refresh token attempt for user ID: {UserId}", stored?.UserId);
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        stored.IsRevoked = true;
        await SetRefreshTokenCookie(stored.UserId);

        var accessToken = GenerateJwt(stored.User);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Access token refreshed for user: {Username}", stored.User.Username);
        return Ok(new { token = accessToken });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (rawToken != null)
        {
            var tokenHash = Hash(rawToken);
            var stored = await _db.RefreshTokens.SingleOrDefaultAsync(r => r.TokenHash == tokenHash);
            if (stored != null) stored.IsRevoked = true;
            await _db.SaveChangesAsync();
        }

        Response.Cookies.Delete("refreshToken");
        _logger.LogInformation("User logged out.");
        return Ok(new { message = "Logged out." });
    }

    private async Task SetRefreshTokenCookie(int userId)
    {
        var rawToken = GenerateRawToken();
        var tokenHash = Hash(rawToken);

        _db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = tokenHash,
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });

        Response.Cookies.Append("refreshToken", rawToken, RefreshCookieOptions);
    }

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string Hash(string input) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}
