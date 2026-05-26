/* ============================================================
   BARGAINBAZAAR — SCRIPT.JS
   Full DOM Manipulation — Negotiation, Cart, Checkout
   ============================================================ */

// ─── PRODUCT DATA ───────────────────────────────────────────
const PRODUCTS = [
  { id: 1,  name: "Ankara Fabric",        emoji: "🧵", category: "Fashion",      desc: "6 yards of premium Ankara print",         price: 18000, minPrice: 10000 },
  { id: 2,  name: "Wireless Earbuds",     emoji: "🎧", category: "Electronics",  desc: "True wireless with noise cancellation",    price: 35000, minPrice: 20000 },
  { id: 3,  name: "Leather Handbag",      emoji: "👜", category: "Fashion",      desc: "Genuine leather, handcrafted finish",       price: 45000, minPrice: 28000 },
  { id: 4,  name: "Jollof Rice Pot",      emoji: "🍲", category: "Kitchen",      desc: "Non-stick, heavy-duty cooking pot 5L",     price: 12000, minPrice: 7000  },
  { id: 5,  name: "Smartphone Stand",     emoji: "📱", category: "Electronics",  desc: "Adjustable aluminum desk stand",           price: 8000,  minPrice: 4500  },
  { id: 6,  name: "Agbada Outfit",        emoji: "👘", category: "Fashion",      desc: "Full embroidered senator outfit",          price: 75000, minPrice: 50000 },
  { id: 7,  name: "Bluetooth Speaker",    emoji: "🔊", category: "Electronics",  desc: "Waterproof, 12hr battery life",            price: 22000, minPrice: 13000 },
  { id: 8,  name: "Woven Basket",         emoji: "🧺", category: "Home",         desc: "Handwoven storage basket set of 3",        price: 9500,  minPrice: 5500  },
  { id: 9,  name: "Laptop Bag",           emoji: "💼", category: "Accessories",  desc: "Padded 15.6\" laptop backpack",            price: 28000, minPrice: 16000 },
  { id: 10, name: "Scented Candles",      emoji: "🕯️", category: "Home",         desc: "Set of 4 luxury shea butter candles",      price: 6500,  minPrice: 3800  },
  { id: 11, name: "Wall Clock",           emoji: "🕐", category: "Home",         desc: "Vintage wooden wall clock 30cm",           price: 15000, minPrice: 9000  },
  { id: 12, name: "Sunglasses",           emoji: "🕶️", category: "Fashion",      desc: "UV400 polarized lens, gold frame",          price: 11000, minPrice: 6000  },
];

// ─── APP STATE ───────────────────────────────────────────────
let state = {
  user: null,
  budget: 0,
  spent: 0,
  cart: [],
  currentProduct: null,
  agreedPrice: null,
  negotiationRounds: 0,
  dealDone: false,
  activeFilter: "all",
};

// ─── DATABASE FUNCTIONS ──────────────────────────────────────
async function saveUserToDB(name) {
  try {
    await fetch("/.netlify/functions/save-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  } catch (err) { console.error("saveUser error:", err); }
}

async function saveNegotiationToDB(product, finalPrice, rounds, outcome) {
  try {
    await fetch("/.netlify/functions/save-negotiation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: state.user,
        productId: product.id,
        productName: product.name,
        listedPrice: product.price,
        finalPrice,
        rounds,
        outcome,
      }),
    });
  } catch (err) { console.error("saveNegotiation error:", err); }
}

async function saveOrderToDB(cart, total, savings) {
  try {
    await fetch("/.netlify/functions/save-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: state.user,
        cart,
        total,
        savings,
      }),
    });
  } catch (err) { console.error("saveOrder error:", err); }
}

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = (n) => "₦" + Number(n).toLocaleString("en-NG");

function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show " + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = "toast"; }, 3000);
}

function scrollChatToBottom() {
  const cw = document.getElementById("chat-window");
  cw.scrollTop = cw.scrollHeight;
}

// ─── LOGIN ───────────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", function () {
  const nameInput  = document.getElementById("username-input");
  const budgetInput = document.getElementById("budget-input");
  const errorEl    = document.getElementById("login-error");

  const name   = nameInput.value.trim();
  const budget = parseFloat(budgetInput.value);

  if (!name) {
    errorEl.textContent = "Please enter your name to continue.";
    nameInput.focus();
    return;
  }
  if (!budget || budget <= 0) {
    errorEl.textContent = "Please enter a valid budget amount.";
    budgetInput.focus();
    return;
  }

  errorEl.textContent = "";
  state.user   = name;
  state.budget = budget;
  state.spent  = 0;

  saveUserToDB(name);

  // Switch screens
  document.getElementById("login-screen").classList.remove("active");
  document.getElementById("store-screen").classList.add("active");

  // Set nav username
  document.getElementById("nav-username").textContent = "👤 " + name;

  updateBudgetUI();
  renderProducts();
});

// Allow Enter key on login
document.getElementById("username-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("budget-input").focus();
});
document.getElementById("budget-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

// ─── LOGOUT ──────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", function () {
  state = { user: null, budget: 0, spent: 0, cart: [], currentProduct: null, agreedPrice: null, negotiationRounds: 0, dealDone: false, activeFilter: "all" };
  document.getElementById("username-input").value = "";
  document.getElementById("budget-input").value   = "";
  document.getElementById("store-screen").classList.remove("active");
  document.getElementById("login-screen").classList.add("active");
  closeCart();
});

// ─── BUDGET UI ───────────────────────────────────────────────
function updateBudgetUI() {
  const remaining = state.budget - state.spent;
  const pct       = Math.min((state.spent / state.budget) * 100, 100);

  document.getElementById("nav-budget").textContent    = fmt(state.budget);
  document.getElementById("nav-spent").textContent     = fmt(state.spent);
  document.getElementById("nav-remaining").textContent = fmt(remaining);

  document.getElementById("budget-bar-label").textContent = `Budget: ${fmt(state.spent)} used of ${fmt(state.budget)}`;
  document.getElementById("budget-bar-pct").textContent   = pct.toFixed(0) + "%";
  document.getElementById("budget-fill").style.width      = pct + "%";
}

// ─── FILTER TABS ─────────────────────────────────────────────
document.querySelectorAll(".filter-tab").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".filter-tab").forEach(function(b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.activeFilter = btn.getAttribute("data-filter");
    renderProducts();
  });
});

// ─── AFFORDABILITY CLASSIFICATION ────────────────────────────
function classify(product) {
  const remaining = state.budget - state.spent;
  if (remaining >= product.price)    return "affordable";
  if (remaining >= product.minPrice) return "negotiable";
  return "out-of-range";
}

// ─── RENDER PRODUCTS ─────────────────────────────────────────
function renderProducts() {
  const grid    = document.getElementById("products-grid");
  const infoEl  = document.getElementById("filter-info");
  grid.innerHTML = "";

  let filtered = PRODUCTS.filter(function(p) {
    const cls = classify(p);
    if (state.activeFilter === "all")       return true;
    if (state.activeFilter === "affordable") return cls === "affordable";
    if (state.activeFilter === "negotiate")  return cls === "negotiable";
    if (state.activeFilter === "wishlist")   return cls === "out-of-range";
    return true;
  });

  infoEl.textContent = "Showing " + filtered.length + " product" + (filtered.length !== 1 ? "s" : "");

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "color:var(--text-3);grid-column:1/-1;text-align:center;padding:40px 0;font-size:0.95rem;";
    empty.textContent = "No products match this filter.";
    grid.appendChild(empty);
    return;
  }

  filtered.forEach(function(product, i) {
    const cls = classify(product);

    const badgeMap = {
      "affordable":  { cls: "badge-can-afford", label: "✅ Can Afford" },
      "negotiable":  { cls: "badge-negotiate",  label: "💬 Negotiate" },
      "out-of-range":{ cls: "badge-out-range",  label: "💸 Out of Range" },
    };
    const badge = badgeMap[cls];

    const card = document.createElement("div");
    card.className = "product-card " + (cls === "negotiable" ? "negotiable" : cls === "affordable" ? "affordable" : "out-of-range");
    card.style.animationDelay = (i * 0.05) + "s";

    const badgeEl = document.createElement("span");
    badgeEl.className = "afford-badge " + badge.cls;
    badgeEl.textContent = badge.label;

    const imgWrap = document.createElement("div");
    imgWrap.className = "product-img-wrap";
    imgWrap.textContent = product.emoji;

    const body = document.createElement("div");
    body.className = "product-body";

    const catEl = document.createElement("p");
    catEl.className = "product-category";
    catEl.textContent = product.category;

    const nameEl = document.createElement("h3");
    nameEl.className = "product-name";
    nameEl.textContent = product.name;

    const descEl = document.createElement("p");
    descEl.className = "product-desc";
    descEl.textContent = product.desc;

    const priceRow = document.createElement("div");
    priceRow.className = "product-price-row";

    const priceEl = document.createElement("span");
    priceEl.className = "product-price";
    priceEl.textContent = fmt(product.price);

    const minHint = document.createElement("span");
    minHint.className = "product-min-hint";
    minHint.textContent = "Min: " + fmt(product.minPrice);

    priceRow.appendChild(priceEl);
    priceRow.appendChild(minHint);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const negBtn = document.createElement("button");
    negBtn.className = "btn-negotiate";
    negBtn.textContent = cls === "out-of-range" ? "💸 Try Anyway" : "💬 Negotiate";
    negBtn.addEventListener("click", function() { openNegotiation(product); });

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add-direct";
    addBtn.textContent = "Buy Listed";
    addBtn.addEventListener("click", function() { addToCartDirect(product); });

    if (cls === "out-of-range") addBtn.disabled = true;

    actions.appendChild(negBtn);
    actions.appendChild(addBtn);

    body.appendChild(catEl);
    body.appendChild(nameEl);
    body.appendChild(descEl);
    body.appendChild(priceRow);
    body.appendChild(actions);

    card.appendChild(badgeEl);
    card.appendChild(imgWrap);
    card.appendChild(body);

    grid.appendChild(card);
  });
}

// ─── ADD TO CART AT LISTED PRICE ─────────────────────────────
function addToCartDirect(product) {
  const remaining = state.budget - state.spent;
  if (product.price > remaining) {
    showToast("Not enough budget! Negotiate the price down 💬", "error");
    return;
  }
  addToCart(product, product.price);
  showToast("Added " + product.name + " at listed price 🛒", "success");
}

// ─── CART MANAGEMENT ─────────────────────────────────────────
function addToCart(product, negotiatedPrice) {
  state.cart.push({
    id:              product.id,
    name:            product.name,
    emoji:           product.emoji,
    originalPrice:   product.price,
    negotiatedPrice: negotiatedPrice,
    buyer:           state.user,
  });
  state.spent += negotiatedPrice;
  updateBudgetUI();
  updateCartUI();
  renderProducts();
}

function removeFromCart(index) {
  const item = state.cart[index];
  state.spent -= item.negotiatedPrice;
  state.cart.splice(index, 1);
  updateBudgetUI();
  updateCartUI();
  renderProducts();
  showToast("Removed " + item.name + " from cart", "");
}

function updateCartUI() {
  const cartItems   = document.getElementById("cart-items");
  const cartEmpty   = document.getElementById("cart-empty");
  const cartFooter  = document.getElementById("cart-footer");
  const cartCount   = document.getElementById("cart-count");

  cartCount.textContent = state.cart.length;

  if (state.cart.length === 0) {
    cartEmpty.style.display  = "flex";
    cartFooter.classList.remove("visible");
    const existingItems = cartItems.querySelectorAll(".cart-item");
    existingItems.forEach(function(el) { el.remove(); });
    return;
  }

  cartEmpty.style.display = "none";
  cartFooter.classList.add("visible");

  const existingItems = cartItems.querySelectorAll(".cart-item");
  existingItems.forEach(function(el) { el.remove(); });

  let originalTotal = 0;
  let cartTotal     = 0;

  state.cart.forEach(function(item, i) {
    originalTotal += item.originalPrice;
    cartTotal     += item.negotiatedPrice;

    const saved = item.originalPrice - item.negotiatedPrice;

    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";

    const emojiEl = document.createElement("div");
    emojiEl.className = "cart-item-emoji";
    emojiEl.textContent = item.emoji;

    const infoEl = document.createElement("div");
    infoEl.className = "cart-item-info";

    const nameEl = document.createElement("p");
    nameEl.className = "cart-item-name";
    nameEl.textContent = item.name;

    const pricesEl = document.createElement("div");
    pricesEl.className = "cart-item-prices";

    const negPriceEl = document.createElement("span");
    negPriceEl.className = "cart-item-negotiated";
    negPriceEl.textContent = fmt(item.negotiatedPrice);

    const origPriceEl = document.createElement("span");
    origPriceEl.className = "cart-item-original";
    origPriceEl.textContent = fmt(item.originalPrice);

    pricesEl.appendChild(negPriceEl);
    pricesEl.appendChild(origPriceEl);

    if (saved > 0) {
      const savedEl = document.createElement("span");
      savedEl.className = "cart-item-saved";
      savedEl.textContent = "-" + fmt(saved);
      pricesEl.appendChild(savedEl);
    }

    const buyerEl = document.createElement("p");
    buyerEl.className = "cart-item-buyer";
    buyerEl.textContent = "Buyer: " + item.buyer;

    infoEl.appendChild(nameEl);
    infoEl.appendChild(pricesEl);
    infoEl.appendChild(buyerEl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-remove-item";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", "Remove " + item.name);
    removeBtn.addEventListener("click", (function(idx) {
      return function() { removeFromCart(idx); };
    })(i));

    itemEl.appendChild(emojiEl);
    itemEl.appendChild(infoEl);
    itemEl.appendChild(removeBtn);

    cartItems.appendChild(itemEl);
  });

  const savings = originalTotal - cartTotal;

  document.getElementById("cart-item-count").textContent   = state.cart.length;
  document.getElementById("cart-original-total").textContent = fmt(originalTotal);
  document.getElementById("cart-savings").textContent       = fmt(savings);
  document.getElementById("cart-total").textContent         = fmt(cartTotal);
}

// ─── CART SIDEBAR OPEN/CLOSE ─────────────────────────────────
function openCart() {
  document.getElementById("cart-sidebar").classList.add("open");
  document.getElementById("cart-overlay").classList.add("active");
}
function closeCart() {
  document.getElementById("cart-sidebar").classList.remove("open");
  document.getElementById("cart-overlay").classList.remove("active");
}

document.getElementById("cart-toggle-btn").addEventListener("click", openCart);
document.getElementById("cart-close-btn").addEventListener("click", closeCart);
document.getElementById("cart-overlay").addEventListener("click", closeCart);

document.getElementById("clear-cart-btn").addEventListener("click", function () {
  if (state.cart.length === 0) return;
  state.spent = 0;
  state.cart  = [];
  updateBudgetUI();
  updateCartUI();
  renderProducts();
  showToast("Cart cleared 🗑", "");
});

// ─── NEGOTIATION MODAL ───────────────────────────────────────
function openNegotiation(product) {
  state.currentProduct    = product;
  state.agreedPrice       = null;
  state.negotiationRounds = 0;
  state.dealDone          = false;

  document.getElementById("modal-product-emoji").textContent = product.emoji;
  document.getElementById("modal-product-name").textContent  = product.name;
  document.getElementById("modal-product-desc").textContent  = product.desc;
  document.getElementById("modal-listed-price").textContent  = fmt(product.price);

  const chatWindow = document.getElementById("chat-window");
  chatWindow.innerHTML = "";

  document.getElementById("offer-input").value = "";
  document.getElementById("offer-hint").textContent = "Make your offer below — the seller will respond!";

  document.getElementById("deal-banner").classList.remove("visible");
  document.getElementById("offer-section").style.display = "block";

  document.getElementById("negotiation-modal").classList.add("open");

  setTimeout(function() {
    addSellerMessage(
      "Hello " + state.user + "! 👋 Welcome. This beautiful " + product.name +
      " is listed at " + fmt(product.price) + ". What offer do you have in mind?"
    );
  }, 300);
}

function closeNegotiation() {
  document.getElementById("negotiation-modal").classList.remove("open");
  state.currentProduct = null;
  state.agreedPrice    = null;
  state.dealDone       = false;
}

document.getElementById("modal-close-btn").addEventListener("click", closeNegotiation);
document.getElementById("negotiation-modal").addEventListener("click", function(e) {
  if (e.target === this) closeNegotiation();
});

// ─── CHAT MESSAGES ───────────────────────────────────────────
function addMessage(role, text, bubbleType) {
  const chatWindow = document.getElementById("chat-window");

  const msgEl = document.createElement("div");
  msgEl.className = "chat-msg " + role;

  const avatarEl = document.createElement("div");
  avatarEl.className = "chat-avatar";
  avatarEl.textContent = role === "seller" ? "🏪" : "👤";

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "chat-bubble" + (bubbleType ? " " + bubbleType : "");
  bubbleEl.textContent = text;

  msgEl.appendChild(avatarEl);
  msgEl.appendChild(bubbleEl);
  chatWindow.appendChild(msgEl);
  scrollChatToBottom();
}

function addSellerMessage(text, bubbleType) {
  addMessage("seller", text, bubbleType || "");
}

function addUserMessage(text) {
  addMessage("user", text, "");
}

function showTypingIndicator() {
  const chatWindow = document.getElementById("chat-window");

  const typingEl = document.createElement("div");
  typingEl.className  = "chat-msg seller";
  typingEl.id         = "typing-indicator";

  const avatarEl = document.createElement("div");
  avatarEl.className  = "chat-avatar";
  avatarEl.textContent = "🏪";

  const bubbleEl = document.createElement("div");
  bubbleEl.className  = "chat-bubble";

  const typingDots = document.createElement("div");
  typingDots.className = "typing-indicator";

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    typingDots.appendChild(dot);
  }

  bubbleEl.appendChild(typingDots);
  typingEl.appendChild(avatarEl);
  typingEl.appendChild(bubbleEl);
  chatWindow.appendChild(typingEl);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

// ─── SEND OFFER ──────────────────────────────────────────────
document.getElementById("send-offer-btn").addEventListener("click", sendOffer);
document.getElementById("offer-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") sendOffer();
});

function sendOffer() {
  if (state.dealDone) return;

  const input     = document.getElementById("offer-input");
  const offerVal  = parseFloat(input.value);
  const product   = state.currentProduct;

  if (!offerVal || offerVal <= 0) {
    showToast("Please enter a valid offer amount", "error");
    return;
  }
  if (offerVal > product.price) {
    showToast("Your offer can't be higher than the listed price!", "error");
    return;
  }

  input.value = "";
  state.negotiationRounds++;

  addUserMessage("My offer: " + fmt(offerVal));

  document.getElementById("send-offer-btn").disabled = true;
  showTypingIndicator();

  const delay = 1000 + Math.random() * 800;

  setTimeout(function() {
    removeTypingIndicator();
    document.getElementById("send-offer-btn").disabled = false;
    sellerRespond(offerVal);
  }, delay);
}

// ─── SELLER AI NEGOTIATION LOGIC ─────────────────────────────
function sellerRespond(offer) {
  const product  = state.currentProduct;
  const listed   = product.price;
  const minPrice = product.minPrice;
  const rounds   = state.negotiationRounds;

  if (offer >= listed) {
    acceptDeal(listed, "That's the listed price, no problem! Deal! 🤝");
    return;
  }

  if (offer >= minPrice) {
    const responses = [
      "Hmm, you drive a hard bargain! " + fmt(offer) + "? Fine, deal! 🤝",
      "Ah, you know your prices! I'll accept " + fmt(offer) + ". Deal! 🤝",
      "You know what? You seem like a good customer. " + fmt(offer) + " accepted! 🤝",
    ];
    acceptDeal(offer, responses[Math.floor(Math.random() * responses.length)]);
    return;
  }

  if (offer < minPrice * 0.5) {
    const rejectMessages = [
      "Haba! " + fmt(offer) + "?! That's too low, my friend. I have a family to feed! Can you do better than that?",
      "Chai! " + fmt(offer) + " for this quality? Please be serious. I can't sell below " + fmt(Math.round(minPrice * 1.1)) + ".",
      "My brother/sister, " + fmt(offer) + " is not possible. This item cost me more than that. Try again!",
    ];
    addSellerMessage(rejectMessages[Math.floor(Math.random() * rejectMessages.length)], "reject");
    document.getElementById("offer-hint").textContent = "Seller rejected — try a higher offer!";
    return;
  }

  if (rounds >= 4) {
    const flexMsg = "Okay okay, you've been patient! I'll do " + fmt(minPrice) + " — final price, I swear on my shop! 😅";
    acceptDeal(minPrice, flexMsg);
    return;
  }

  const gap         = listed - minPrice;
  const flexibility = Math.min(rounds * 0.15, 0.6);
  const counterPrice = Math.round(listed - (gap * flexibility));
  const finalCounter = Math.max(counterPrice, minPrice);

  const counterMessages = [
    "I hear you, but " + fmt(offer) + " is too low. How about " + fmt(finalCounter) + "? That's my best offer so far.",
    "Okay, because you're a valued customer — I'll go down to " + fmt(finalCounter) + ". What do you say?",
    "You're almost there! Meet me at " + fmt(finalCounter) + " and we have a deal.",
    "Hmm, let me see… I can do " + fmt(finalCounter) + ". That's a great price for this quality!",
  ];

  addSellerMessage(counterMessages[Math.floor(Math.random() * counterMessages.length)], "counter");
  document.getElementById("offer-hint").textContent = "Seller countered at " + fmt(finalCounter) + " — negotiate further or accept!";

  addQuickAcceptButton(finalCounter);
}

function addQuickAcceptButton(price) {
  const chatWindow = document.getElementById("chat-window");

  const existing = document.getElementById("quick-accept-row");
  if (existing) existing.remove();

  const row = document.createElement("div");
  row.id = "quick-accept-row";
  row.style.cssText = "display:flex;justify-content:flex-end;padding:4px 0;";

  const btn = document.createElement("button");
  btn.textContent = "✅ Accept " + fmt(price);
  btn.style.cssText = "background:var(--green-bg);color:var(--green);border:1px solid var(--green-dim);padding:8px 14px;border-radius:10px;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.2s;";
  btn.addEventListener("mouseenter", function() { btn.style.background = "var(--green-dim)"; });
  btn.addEventListener("mouseleave", function() { btn.style.background = "var(--green-bg)"; });
  btn.addEventListener("click", function() {
    row.remove();
    state.negotiationRounds++;
    addUserMessage("Okay, I accept " + fmt(price) + "! ✅");
    showTypingIndicator();
    setTimeout(function() {
      removeTypingIndicator();
      acceptDeal(price, "Excellent! It's a deal at " + fmt(price) + "! 🤝 Pleasure doing business with you!");
    }, 800);
  });

  row.appendChild(btn);
  chatWindow.appendChild(row);
  scrollChatToBottom();
}

// ─── DEAL ACCEPTED ───────────────────────────────────────────
function acceptDeal(price, sellerMsg) {
  state.agreedPrice = price;
  state.dealDone    = true;

  saveNegotiationToDB(state.currentProduct, price, state.negotiationRounds, "accepted");

  addSellerMessage(sellerMsg, "accept");

  const existing = document.getElementById("quick-accept-row");
  if (existing) existing.remove();

  document.getElementById("offer-section").style.display = "none";

  const saved     = state.currentProduct.price - price;
  const banner    = document.getElementById("deal-banner");
  const priceDisp = document.getElementById("agreed-price-display");
  const savedLine = document.getElementById("deal-saved-line");

  priceDisp.textContent = fmt(price);
  savedLine.textContent = saved > 0
    ? "🎉 You saved " + fmt(saved) + " (" + Math.round((saved / state.currentProduct.price) * 100) + "% off)!"
    : "You got it at the listed price!";

  banner.classList.add("visible");
  scrollChatToBottom();
}

// ─── ADD TO CART FROM DEAL ────────────────────────────────────
document.getElementById("add-to-cart-btn").addEventListener("click", function () {
  const product = state.currentProduct;
  const price   = state.agreedPrice;
  const remaining = state.budget - state.spent;

  if (price > remaining) {
    showToast("Not enough budget remaining for this price! 😬", "error");
    return;
  }

  addToCart(product, price);
  closeNegotiation();
  openCart();
  showToast("🎉 " + product.name + " added for " + fmt(price) + "!", "success");
});

document.getElementById("decline-deal-btn").addEventListener("click", function() {
  closeNegotiation();
  showToast("Deal declined. Maybe next time! 👋", "");
});

// ─── CHECKOUT ────────────────────────────────────────────────
document.getElementById("checkout-btn").addEventListener("click", openCheckout);

function openCheckout() {
  if (state.cart.length === 0) {
    showToast("Your cart is empty!", "error");
    return;
  }

  const body = document.getElementById("checkout-body");
  body.innerHTML = "";

  let originalTotal = 0;
  let cartTotal     = 0;

  state.cart.forEach(function(item) {
    originalTotal += item.originalPrice;
    cartTotal     += item.negotiatedPrice;

    const row = document.createElement("div");
    row.className = "checkout-item";

    const emojiEl = document.createElement("span");
    emojiEl.className = "checkout-item-emoji";
    emojiEl.textContent = item.emoji;

    const infoEl = document.createElement("div");
    infoEl.className = "checkout-item-info";

    const nameEl = document.createElement("p");
    nameEl.className = "checkout-item-name";
    nameEl.textContent = item.name;

    const priceEl = document.createElement("p");
    priceEl.className = "checkout-item-price";
    priceEl.textContent = fmt(item.negotiatedPrice);

    const origEl = document.createElement("p");
    origEl.className = "checkout-item-original";
    origEl.textContent = "Listed: " + fmt(item.originalPrice);

    infoEl.appendChild(nameEl);
    infoEl.appendChild(priceEl);
    infoEl.appendChild(origEl);

    row.appendChild(emojiEl);
    row.appendChild(infoEl);
    body.appendChild(row);
  });

  const savings = originalTotal - cartTotal;

  const totals = document.createElement("div");
  totals.className = "checkout-totals";

  function makeTotalRow(label, value, cls) {
    const row = document.createElement("div");
    row.className = "checkout-total-row " + (cls || "");
    const lbl = document.createElement("span");
    lbl.textContent = label;
    const val = document.createElement("span");
    val.textContent = value;
    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  totals.appendChild(makeTotalRow("Items", state.cart.length));
  totals.appendChild(makeTotalRow("Original Total", fmt(originalTotal)));
  totals.appendChild(makeTotalRow("🎉 Total Savings", fmt(savings), "checkout-grand-savings"));

  const grandRow = document.createElement("div");
  grandRow.className = "checkout-total-row checkout-grand-total";
  const grandLbl = document.createElement("span");
  grandLbl.textContent = "Grand Total";
  const grandVal = document.createElement("strong");
  grandVal.textContent = fmt(cartTotal);
  grandRow.appendChild(grandLbl);
  grandRow.appendChild(grandVal);
  totals.appendChild(grandRow);

  body.appendChild(totals);

  closeCart();
  document.getElementById("checkout-modal").classList.add("open");
}

document.getElementById("checkout-close-btn").addEventListener("click", function() {
  document.getElementById("checkout-modal").classList.remove("open");
});

// ─── PLACE ORDER ─────────────────────────────────────────────
document.getElementById("place-order-btn").addEventListener("click", function () {
  const savings = state.cart.reduce(function(acc, item) {
    return acc + (item.originalPrice - item.negotiatedPrice);
  }, 0);
  const total = state.cart.reduce(function(acc, item) {
    return acc + item.negotiatedPrice;
  }, 0);

  saveOrderToDB(state.cart, total, savings);

  document.getElementById("checkout-modal").classList.remove("open");
  document.getElementById("order-success-modal").classList.add("open");

  document.getElementById("success-message").textContent =
    "Thank you, " + state.user + "! 🎉 Your order of " + state.cart.length +
    " item(s) for " + fmt(total) + " has been placed. You saved a total of " +
    fmt(savings) + " through negotiation. Well bargained! 🤝";

  state.cart  = [];
  state.spent = 0;
  updateBudgetUI();
  updateCartUI();
  renderProducts();
});

document.getElementById("continue-shopping-btn").addEventListener("click", function() {
  document.getElementById("order-success-modal").classList.remove("open");
  showToast("Happy shopping! 🛍️", "success");
});