const { neon } = require("@netlify/database");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const { userName, productId, productName, listedPrice, finalPrice, rounds, outcome } = JSON.parse(event.body);

  try {
    await sql`
      INSERT INTO negotiations (user_name, product_id, product_name, listed_price, final_price, rounds, outcome)
      VALUES (${userName}, ${productId}, ${productName}, ${listedPrice}, ${finalPrice}, ${rounds}, ${outcome})
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