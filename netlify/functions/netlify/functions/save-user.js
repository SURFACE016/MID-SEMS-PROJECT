const { neon } = require("@netlify/database");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const { name } = JSON.parse(event.body);

  try {
    await sql`
      INSERT INTO users (name)
      VALUES (${name})
      ON CONFLICT DO NOTHING
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};