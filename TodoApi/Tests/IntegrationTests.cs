using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TodoApi.Data;

namespace TodoApi.Tests;

public class IntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public IntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("IntegrationTestDb"));
            });
        });
    }

    private HttpClient CreateClient(WebApplicationFactoryClientOptions? options = null) =>
        options != null ? _factory.CreateClient(options) : _factory.CreateClient();

    [Fact]
    public async Task Register_ThenLogin_ReturnsToken()
    {
        var client = CreateClient();

        var register = await client.PostAsJsonAsync("/api/auth/register", new { username = "alice123", password = "correcthorsebatterystaple" });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { username = "alice123", password = "correcthorsebatterystaple" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        var body = await login.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(body!["token"]);
    }

    [Fact]
    public async Task GetTodos_WithoutToken_ReturnsUnauthorized()
    {
        var client = CreateClient();

        var response = await client.GetAsync("/api/todos");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithValidCookie_ReturnsNewToken()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await client.PostAsJsonAsync("/api/auth/register", new { username = "carol123", password = "correcthorsebatterystaple" });
        await client.PostAsJsonAsync("/api/auth/login", new { username = "carol123", password = "correcthorsebatterystaple" });

        var refresh = await client.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);

        var body = await refresh.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(body!["token"]);
    }

    [Fact]
    public async Task Refresh_WithoutCookie_ReturnsUnauthorized()
    {
        var client = CreateClient();

        var response = await client.PostAsync("/api/auth/refresh", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

        await client.PostAsJsonAsync("/api/auth/register", new { username = "dave123", password = "correcthorsebatterystaple" });
        await client.PostAsJsonAsync("/api/auth/login", new { username = "dave123", password = "correcthorsebatterystaple" });

        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, logout.StatusCode);

        var refresh = await client.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task FullTodoFlow_CreateToggleDelete()
    {
        var client = CreateClient();

        await client.PostAsJsonAsync("/api/auth/register", new { username = "bob123", password = "correcthorsebatterystaple" });
        var login = await client.PostAsJsonAsync("/api/auth/login", new { username = "bob123", password = "correcthorsebatterystaple" });
        var loginBody = await login.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        var token = loginBody!["token"];

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var create = await client.PostAsJsonAsync("/api/todos", new { title = "Buy milk" });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var todo = await create.Content.ReadFromJsonAsync<Dictionary<string, JsonElement>>();
        var id = todo!["id"].GetInt32();

        var toggle = await client.PutAsync($"/api/todos/{id}", null);
        Assert.Equal(HttpStatusCode.OK, toggle.StatusCode);
        var toggled = await toggle.Content.ReadFromJsonAsync<Dictionary<string, JsonElement>>();
        Assert.True(toggled!["isCompleted"].GetBoolean());

        var delete = await client.DeleteAsync($"/api/todos/{id}");
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        var todos = await client.GetFromJsonAsync<List<Dictionary<string, JsonElement>>>("/api/todos");
        Assert.Empty(todos!);
    }
}
