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
                    "SELECT kyc_approved, balance FROM users WHERE id = @username", conn);
                cmd.Parameters.AddWithValue("username", req.Username);

                using var reader = cmd.ExecuteReader();

                if (!reader.Read())
                {
                    return Unauthorized(new { status = "Rejected", reason = "User not found" });
                }

                bool kycApproved = reader.GetBoolean(0);
                decimal balance = reader.GetDecimal(1);

                if (kycApproved && balance >= 100)
                    return Ok(new { status = "Approved" });

                return BadRequest(new { status = "Rejected", reason = "Compliance criteria not met" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = "Error", message = ex.Message });
            }
        }

        public class UserRequest
        {
            public string Username { get; set; }
        }
    }
}
