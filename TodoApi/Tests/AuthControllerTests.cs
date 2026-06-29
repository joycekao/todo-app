using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using TodoApi.Controllers;
using TodoApi.Data;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class AuthControllerTests
{
    private AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private AuthController CreateController(AppDbContext db)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Jwt:Key", "test-secret-key-that-is-long-enough-32!!" },
                { "Jwt:Issuer", "TestIssuer" },
                { "Jwt:Audience", "TestAudience" }
            })
            .Build();

        var env = new TestWebHostEnvironment { EnvironmentName = "Development" };
        var controller = new AuthController(db, config, env, NullLogger<AuthController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    private const string ValidUsername = "alice123";
    private const string ValidPassword = "correcthorsebatterystaple";

    [Fact]
    public async Task Register_WithValidCredentials_ReturnsOk()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto(ValidUsername, ValidPassword));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithDuplicateUsername_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        await controller.Register(new RegisterDto(ValidUsername, ValidPassword));
        var result = await controller.Register(new RegisterDto(ValidUsername, ValidPassword));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithEmptyUsername_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto("", ValidPassword));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithUsernameTooShort_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto("abc", ValidPassword));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithUsernameTooLong_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto(new string('a', 27), ValidPassword));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithUsernameStartingWithDigit_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto("1alice", ValidPassword));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithUsernameContainingInvalidChars_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto("alice_123", ValidPassword));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithPasswordTooShort_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto(ValidUsername, "tooshort"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_WithPasswordTooLong_ReturnsBadRequest()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Register(new RegisterDto(ValidUsername, new string('a', 65)));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        await controller.Register(new RegisterDto(ValidUsername, ValidPassword));
        var result = await controller.Login(new LoginDto(ValidUsername, ValidPassword));

        var ok = Assert.IsType<OkObjectResult>(result);
        var value = ok.Value!.ToString();
        Assert.Contains("token", value);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        await controller.Register(new RegisterDto(ValidUsername, ValidPassword));
        var result = await controller.Login(new LoginDto(ValidUsername, "wrongpasswordthatisalsolongenough"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithNonExistentUser_ReturnsUnauthorized()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Login(new LoginDto("nobody", ValidPassword));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }
}

class TestWebHostEnvironment : IWebHostEnvironment
{
    public string EnvironmentName { get; set; } = "Development";
    public string ApplicationName { get; set; } = "TodoApi";
    public string WebRootPath { get; set; } = "";
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string ContentRootPath { get; set; } = "";
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
