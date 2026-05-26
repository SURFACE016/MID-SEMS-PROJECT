const { neon } = require("@netlify/database");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const { userName, cart, total, savings } = JSON.parse(event.body);

  try {
    // Save order
    const orderResult = await sql`
      INSERT INTO orders (user_name, total_amount, total_savings, item_count)
      VALUES (${userName}, ${total}, ${savings}, ${cart.length})
      RETURNING id
    `;
    const orderId = orderResult[0].id;

    // Save each item
    for (const item of cart) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, original_price, negotiated_price)
        VALUES (${orderId}, ${item.id}, ${item.name}, ${item.originalPrice}, ${item.negotiatedPrice})
      `;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, orderId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};