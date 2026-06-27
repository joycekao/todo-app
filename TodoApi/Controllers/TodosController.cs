using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/todos")]
[Authorize]
public class TodosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<TodosController> _logger;

    public TodosController(AppDbContext db, ILogger<TodosController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var todos = await _db.Todos
            .Where(t => t.UserId == UserId)
            .OrderBy(t => t.CreatedAt)
            .Select(t => new { t.Id, t.Title, t.IsCompleted, t.CreatedAt })
            .ToListAsync();

        return Ok(todos);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTodoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        if (dto.Title.Length > 200)
            return BadRequest(new { message = "Title must be 200 characters or fewer." });

        var todo = new TodoItem { Title = dto.Title, UserId = UserId };
        _db.Todos.Add(todo);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Todo created (id: {Id}) for user {UserId}.", todo.Id, UserId);
        return Ok(new { todo.Id, todo.Title, todo.IsCompleted, todo.CreatedAt });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Toggle(int id)
    {
        var todo = await _db.Todos.SingleOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (todo == null) return NotFound(new { message = "Todo not found." });

        todo.IsCompleted = !todo.IsCompleted;
        await _db.SaveChangesAsync();

        return Ok(new { todo.Id, todo.Title, todo.IsCompleted, todo.CreatedAt });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var todo = await _db.Todos.SingleOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (todo == null) return NotFound(new { message = "Todo not found." });

        _db.Todos.Remove(todo);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Todo deleted (id: {Id}) for user {UserId}.", id, UserId);
        return Ok(new { message = "Todo deleted." });
    }
}
