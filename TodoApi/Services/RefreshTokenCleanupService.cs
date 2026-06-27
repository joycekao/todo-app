using Microsoft.EntityFrameworkCore;
using TodoApi.Data;

namespace TodoApi.Services;

// Runs every 24 hours to purge expired and revoked refresh tokens, preventing unbounded table growth.
public class RefreshTokenCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenCleanupService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(24);

    public RefreshTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<RefreshTokenCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await CleanupAsync();
            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task CleanupAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var stale = await db.RefreshTokens
            .Where(r => r.IsRevoked || r.ExpiresAt < DateTime.UtcNow)
            .ToListAsync();

        if (stale.Count > 0)
        {
            db.RefreshTokens.RemoveRange(stale);
            await db.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} expired or revoked refresh tokens.", stale.Count);
        }
    }
}
