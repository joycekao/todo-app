using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TodoApi.Controllers;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Tests;

public class TodosControllerTests
{
    private AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private TodosController CreateController(AppDbContext db, int userId)
    {
        var controller = new TodosController(db, NullLogger<TodosController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                }))
            }
        };
        return controller;
    }

    private async Task<User> SeedUser(AppDbContext db, int id = 1)
    {
        var user = new User { Id = id, Username = $"user{id}", PasswordHash = "hash" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task GetAll_ReturnsOnlyCurrentUsersTodos()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);
        await SeedUser(db, 2);
        db.Todos.AddRange(
            new TodoItem { Title = "User1 Todo", UserId = 1 },
            new TodoItem { Title = "User2 Todo", UserId = 2 }
        );
        await db.SaveChangesAsync();

        var result = await CreateController(db, 1).GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var todos = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value);
        Assert.Single(todos);
    }

    [Fact]
    public async Task Create_WithValidTitle_ReturnsTodo()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);

        var result = await CreateController(db, 1).Create(new CreateTodoDto("Buy milk"));

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Create_WithEmptyTitle_ReturnsBadRequest()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);

        var result = await CreateController(db, 1).Create(new CreateTodoDto(""));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_WithTitleTooLong_ReturnsBadRequest()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);

        var result = await CreateController(db, 1).Create(new CreateTodoDto(new string('a', 201)));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Toggle_FlipsIsCompleted()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);
        var todo = new TodoItem { Title = "Buy milk", UserId = 1, IsCompleted = false };
        db.Todos.Add(todo);
        await db.SaveChangesAsync();

        await CreateController(db, 1).Toggle(todo.Id);

        var updated = await db.Todos.FindAsync(todo.Id);
        Assert.True(updated!.IsCompleted);
    }

    [Fact]
    public async Task Toggle_OnAnotherUsersTodo_ReturnsNotFound()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);
        await SeedUser(db, 2);
        var todo = new TodoItem { Title = "User2 Todo", UserId = 2 };
        db.Todos.Add(todo);
        await db.SaveChangesAsync();

        var result = await CreateController(db, 1).Toggle(todo.Id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Delete_RemovesTodo()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);
        var todo = new TodoItem { Title = "Buy milk", UserId = 1 };
        db.Todos.Add(todo);
        await db.SaveChangesAsync();

        await CreateController(db, 1).Delete(todo.Id);

        Assert.Null(await db.Todos.FindAsync(todo.Id));
    }

    [Fact]
    public async Task Delete_OnAnotherUsersTodo_ReturnsNotFound()
    {
        using var db = CreateDb();
        await SeedUser(db, 1);
        await SeedUser(db, 2);
        var todo = new TodoItem { Title = "User2 Todo", UserId = 2 };
        db.Todos.Add(todo);
        await db.SaveChangesAsync();

        var result = await CreateController(db, 1).Delete(todo.Id);

        Assert.IsType<NotFoundObjectResult>(result);
    }
}
