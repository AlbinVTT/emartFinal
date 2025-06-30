using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace ComplianceService.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ComplianceCheckController : ControllerBase
    {
        [HttpPost]
        public IActionResult Check([FromBody] UserRequest req)
        {
            try
            {
                var connString = "Host=postgres;Username=emartuser;Password=emartpass;Database=emartdb";

                using var conn = new NpgsqlConnection(connString);
                conn.Open();

                using var cmd = new NpgsqlCommand(
                    "SELECT kyc_verified, balance FROM users WHERE id = @id", conn);
                cmd.Parameters.AddWithValue("id", req.Id);

                using var reader = cmd.ExecuteReader();

                if (!reader.Read())
                {
                    return Unauthorized(new { status = "Rejected", reason = "User not found" });
                }

                bool kycVerified = reader.GetBoolean(0);
                decimal balance = reader.GetDecimal(1);

                if (!kycVerified)
                    return BadRequest(new { status = "Rejected", reason = "KYC not verified" });

                if (balance < 100)
                    return BadRequest(new { status = "Rejected", reason = "Insufficient balance (minimum ₹100 required)" });

                return Ok(new { status = "Approved" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = "Error", message = ex.Message });
            }
        }

        public class UserRequest
        {
            public string Id { get; set; }
        }
    }
}
