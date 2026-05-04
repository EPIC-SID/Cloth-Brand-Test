const API_BASE = "";

// State Management
let cart = JSON.parse(localStorage.getItem('elan_prive_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('elan_prive_wishlist')) || [];
let allProducts = [];
let currentProduct = null;

// DOM Elements
const cartCountElements = document.querySelectorAll('.cart-count');
const conciergeTrigger = document.getElementById('concierge-trigger');
const conciergeWindow = document.getElementById('concierge-window');
const chatClose = document.getElementById('chat-close');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    setupEventListeners();
    
    // Page specific initialization
    const path = window.location.pathname;
    if (path.includes('shop.html')) {
        fetchProducts();
    } else if (path.includes('cart.html')) {
        renderCart();
    } else if (path.includes('checkout.html')) {
        setupCheckout();
    } else if (path.includes('index.html') || path === '/' || path.endsWith('Test/')) {
        fetchFeaturedProducts();
    }

    initScrollReveal();
    setupSearch();
    initParallax();
    setupNewsletter();
    setupWishlistEvents();
    updateWishlistUI();
});

function setupEventListeners() {
    // Chatbot Toggle
    if (conciergeTrigger) {
        conciergeTrigger.addEventListener('click', () => {
            conciergeWindow.style.display = conciergeWindow.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    if (chatClose) {
        chatClose.addEventListener('click', () => {
            conciergeWindow.style.display = 'none';
        });
    }

    // Chatbot Submit
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;

            addChatMessage('user', message);
            chatInput.value = '';

            try {
                const response = await fetch(`${API_BASE}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                const data = await response.json();
                setTimeout(() => addChatMessage('bot', data.reply), 500);
            } catch (error) {
                console.error('Chat error:', error);
                addChatMessage('bot', "I apologize, my connection to the atelier is currently interrupted. Please try again shortly.");
            }
        });
    }
}

// --- Product Logic ---
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('API unreachable');
        allProducts = await response.json();
    } catch (error) {
        console.error('Fetch products error, using fallback:', error);
        allProducts = getFallbackProducts(); // Use local data if API fails
    }
    renderProducts(allProducts);
    setupFilters();
}

function getFallbackProducts() {
    return [
        { id: 1, name: "Midnight Silk Gown", category: "Women", price: 2450, image: "assets/gown-blue.png", description: "Italian silk gown.", sizes: ["S", "M"], colors: ["Midnight Blue", "Obsidian"] },
        { id: 2, name: "Charcoal Tailored Suit", category: "Men", price: 3800, image: "assets/suit-charcoal.png", description: "Super 150s wool suit.", sizes: ["48", "50"], colors: ["Charcoal", "Deep Navy"] },
        { id: 3, name: "Ivory Cashmere Sweater", category: "Women", price: 950, image: "assets/sweater-ivory.png", description: "Pure Mongolian cashmere.", sizes: ["S", "M"], colors: ["Ivory"] },
        { id: 4, name: "Navy Velvet Blazer", category: "Men", price: 1250, image: "assets/blazer-navy.png", description: "Deep navy velvet blazer.", sizes: ["48", "50"], colors: ["Deep Navy", "Forest Green"] },
        { id: 5, name: "Gold Accent Evening Clutch", category: "Accessories", price: 1800, image: "assets/clutch-black.png", description: "Handcrafted calfskin leather.", sizes: ["One Size"], colors: ["Gold/Black"] },
        { id: 6, name: "Polished Calfskin Oxfords", category: "Accessories", price: 850, image: "assets/oxfords-cognac.png", description: "Masterfully crafted in Florence.", sizes: ["42", "43"], colors: ["Cognac", "Black"] },
        { id: 7, name: "Silk Pocket Square", category: "Accessories", price: 150, image: "assets/pocket-square.png", description: "Pure Italian silk.", sizes: ["One Size"], colors: ["Champagne", "Silver"] }
    ];
}

async function fetchFeaturedProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        renderProducts(products.slice(0, 3), 'featured-grid');
    } catch (error) {
        console.error('Fetch featured error:', error);
    }
}

function renderProducts(products, containerId = 'product-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = products.map(product => `
        <div class="product-card reveal" onclick="openProductModal(${product.id})">
            <div class="product-image">
                <img src="${API_BASE}${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1539109132304-351ae3f3ad67?auto=format&fit=crop&q=80&w=800'">
                <button class="wishlist-btn ${isWishlisted(product.id) ? 'active' : ''}" onclick="toggleWishlist(event, ${product.id})">
                    <i class="${isWishlisted(product.id) ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <div class="quick-view-overlay">
                    <button class="btn-discover">Discover</button>
                </div>
            </div>
            <div class="product-info">
                <p class="serif" style="text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1px; color: #888; margin-bottom: 5px;">${product.category}</p>
                <h3>${product.name}</h3>
                <p class="product-price">$${product.price.toLocaleString()}</p>
            </div>
        </div>
    `).join('');
    
    // Refresh reveal observer for new elements
    setTimeout(initScrollReveal, 100);
}

function setupFilters() {
    const categoryBtns = document.querySelectorAll('.filter-btn');
    const priceBtns = document.querySelectorAll('.price-btn');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.category;
            const filtered = cat === 'All' ? allProducts : allProducts.filter(p => p.category === cat);
            renderProducts(filtered);
            
            // UI Updates
            categoryBtns.forEach(b => b.classList.remove('active'));
            priceBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    priceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const min = parseFloat(btn.dataset.min);
            const max = parseFloat(btn.dataset.max);
            const filtered = allProducts.filter(p => p.price >= min && p.price < max);
            renderProducts(filtered);

            // UI Updates
            priceBtns.forEach(b => b.classList.remove('active'));
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// --- Modal Logic ---
function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId) || cart.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-detail-content');
    
    modalContent.innerHTML = `
        <div class="modal-left">
            <img id="modal-main-image" src="${API_BASE}${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1539109132304-351ae3f3ad67?auto=format&fit=crop&q=80&w=800'">
        </div>
        <div class="modal-right">
            <span class="serif" style="text-transform: uppercase; font-size: 0.8rem; letter-spacing: 2px; color: #888;">${product.category} Collection</span>
            <h2>${product.name}</h2>
            <p class="modal-price">$${product.price.toLocaleString()}</p>
            <p class="modal-description">${product.description}</p>
            
            <span class="selector-label">Select Size</span>
            <div class="options-group" id="size-options">
                ${product.sizes.map(size => `<div class="option-pill" onclick="selectOption(this, 'size')">${size}</div>`).join('')}
            </div>

            <span class="selector-label">Select Color</span>
            <div class="options-group" id="color-options">
                ${product.colors.map(color => `<div class="option-pill" onclick="selectOption(this, 'color')">${color}</div>`).join('')}
            </div>

            <div style="margin: 20px 0;">
                <button class="btn-text" onclick="toggleSizeGuide()">+ View Sizing & Fit Guide</button>
                <div id="size-guide" style="display: none; margin-top: 15px; font-size: 0.8rem; color: #666;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #eee;"><td>Size</td><td>Chest</td><td>Waist</td></tr>
                        <tr><td>S</td><td>36"</td><td>30"</td></tr>
                        <tr><td>M</td><td>38"</td><td>32"</td></tr>
                        <tr><td>L</td><td>40"</td><td>34"</td></tr>
                    </table>
                </div>
            </div>

            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="addToCart(${product.id})">Add to Collection</button>
        </div>
    `;

    currentProduct = product;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function toggleSizeGuide() {
    const guide = document.getElementById('size-guide');
    guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
}

function selectOption(el, type) {
    const parent = el.parentElement;
    parent.querySelectorAll('.option-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    // Switch image if color is selected
    if (type === 'color' && currentProduct && currentProduct.images) {
        const colorName = el.innerText;
        const newImage = currentProduct.images[colorName];
        if (newImage) {
            document.getElementById('modal-main-image').src = `${API_BASE}${newImage}`;
        }
    }
}

// --- Cart Logic ---
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    const size = document.querySelector('#size-options .active')?.innerText;
    const color = document.querySelector('#color-options .active')?.innerText;

    if (!size || !color) {
        alert('Please select size and color preference.');
        return;
    }

    const cartItem = {
        ...product,
        selectedSize: size,
        selectedColor: color,
        quantity: 1
    };

    cart.push(cartItem);
    localStorage.setItem('elan_prive_cart', JSON.stringify(cart));
    updateCartCount();
    closeModal();
    
    // Animated feedback
    const btn = document.querySelector('.btn-primary');
    btn.innerText = 'Added to Collection';
    setTimeout(() => {
        alert('Item added to your collection.');
    }, 100);
}

function updateCartCount() {
    const total = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountElements.forEach(el => el.innerText = total);
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 100px 0;">Your collection is currently empty. <br><br> <a href="shop.html" class="btn btn-primary">Discover Collections</a></td></tr>';
        updateTotals();
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <tr>
            <td>
                <div class="cart-item">
                    <img src="${API_BASE}${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1539109132304-351ae3f3ad67?auto=format&fit=crop&q=80&w=800'">
                    <div>
                        <h4 class="serif">${item.name}</h4>
                        <p style="font-size: 0.8rem; color: #888;">${item.selectedSize} | ${item.selectedColor}</p>
                    </div>
                </div>
            </td>
            <td>$${item.price.toLocaleString()}</td>
            <td>
                <input type="number" class="qty-input" value="${item.quantity}" min="1" onchange="updateQty(${index}, this.value)">
            </td>
            <td style="text-align: right;">
                <button class="icon-btn" onclick="removeFromCart(${index})"><i class="fas fa-times"></i></button>
            </td>
        </tr>
    `).join('');

    updateTotals();
}

function updateQty(index, val) {
    cart[index].quantity = parseInt(val);
    localStorage.setItem('elan_prive_cart', JSON.stringify(cart));
    updateTotals();
    updateCartCount();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('elan_prive_cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

function updateTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = subtotal > 2000 ? 0 : 50;
    const total = subtotal + shipping;

    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shipping');
    const totalEl = document.getElementById('total');

    if (subtotalEl) subtotalEl.innerText = `$${subtotal.toLocaleString()}`;
    if (shippingEl) shippingEl.innerText = shipping === 0 ? 'Complimentary' : `$${shipping.toLocaleString()}`;
    if (totalEl) totalEl.innerText = `$${total.toLocaleString()}`;
}

// --- Checkout Logic ---
function setupCheckout() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    // Render summary in checkout
    const summaryList = document.getElementById('checkout-summary-list');
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    summaryList.innerHTML = cart.map(item => `
        <div class="summary-row">
            <span>${item.name} (x${item.quantity})</span>
            <span>$${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('');

    document.getElementById('checkout-total').innerText = `$${(subtotal + (subtotal > 2000 ? 0 : 50)).toLocaleString()}`;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            address: formData.get('address'),
            cartItems: cart
        };

        try {
            const response = await fetch(`${API_BASE}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                // Clear cart
                cart = [];
                localStorage.setItem('elan_prive_cart', JSON.stringify(cart));
                
                // Show confirmation
                document.querySelector('.container').innerHTML = `
                    <div style="text-align: center; padding: 100px 0;">
                        <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--accent-color); margin-bottom: 30px;"></i>
                        <h1 class="serif">Thank you for your order.</h1>
                        <p style="margin: 20px 0; color: #666;">Your order #${result.order_id} has been placed successfully. <br> A confirmation email has been sent to your inbox.</p>
                        <a href="index.html" class="btn btn-primary">Return to Boutique</a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('There was an issue processing your order. Please try again.');
        }
    });
}

// --- Chat Message UI Helper ---
function addChatMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Wishlist Logic ---
function toggleWishlist(e, productId) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const index = wishlist.indexOf(productId);
    const wasAdded = index === -1;

    if (!wasAdded) {
        wishlist.splice(index, 1);
    } else {
        wishlist.push(productId);
        showNotification("Item added to your curated collection.");
    }
    
    localStorage.setItem('elan_prive_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
}

function updateWishlistUI() {
    // Update all heart icons on cards
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/toggleWishlist\(.*,\s*(\d+)\)/);
            if (match && match[1]) {
                const productId = parseInt(match[1]);
                const icon = btn.querySelector('i');
                if (wishlist.includes(productId)) {
                    btn.classList.add('active');
                    if (icon) { icon.classList.add('fas'); icon.classList.remove('far'); }
                } else {
                    btn.classList.remove('active');
                    if (icon) { icon.classList.remove('fas'); icon.classList.add('far'); }
                }
            }
        }
    });

    // Update Nav Count
    const countElement = document.querySelector('.wishlist-count');
    if (countElement) {
        countElement.innerText = wishlist.length;
        countElement.style.display = wishlist.length > 0 ? 'block' : 'none';
    }

    renderWishlist();
}

function renderWishlist() {
    const container = document.getElementById('wishlist-items');
    if (!container) return;

    if (wishlist.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; margin-top: 50px;">Your collection is empty.</p>';
        return;
    }

    const wishlistedProducts = allProducts.filter(p => wishlist.includes(p.id));
    
    container.innerHTML = wishlistedProducts.map(product => `
        <div class="wishlist-item">
            <img src="${API_BASE}${product.image}" alt="${product.name}">
            <div class="wishlist-item-info">
                <h4 class="serif">${product.name}</h4>
                <p>${product.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                <button class="btn-text" onclick="toggleWishlist(null, ${product.id})" style="color: #ff4444; margin-top: 5px;">Remove</button>
            </div>
            <button class="icon-btn" onclick="openProductModal(${product.id})"><i class="fas fa-chevron-right"></i></button>
        </div>
    `).join('');
}

function setupWishlistEvents() {
    const trigger = document.getElementById('wishlist-trigger');
    const closeBtn = document.getElementById('wishlist-close');
    const sidebar = document.getElementById('wishlist-sidebar');

    if (trigger && sidebar) {
        trigger.addEventListener('click', () => {
            sidebar.classList.add('active');
            renderWishlist();
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
}

function showNotification(text) {
    const note = document.createElement('div');
    note.className = 'notification';
    note.innerText = text;
    document.body.appendChild(note);
    setTimeout(() => note.classList.add('active'), 100);
    setTimeout(() => {
        note.classList.remove('active');
        setTimeout(() => setTimeout(() => note.remove(), 500), 500);
    }, 3000);
}

function isWishlisted(productId) {
    return wishlist.includes(productId);
}

// --- Search Logic ---
function setupSearch() {
    const searchBtn = document.querySelector('.fa-search').parentElement;
    searchBtn.addEventListener('click', () => {
        const query = prompt('Search our collections:');
        if (query) {
            const filtered = allProducts.filter(p => 
                p.name.toLowerCase().includes(query.toLowerCase()) || 
                p.category.toLowerCase().includes(query.toLowerCase())
            );
            
            if (window.location.pathname.includes('shop.html')) {
                renderProducts(filtered);
            } else {
                window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
            }
        }
    });

    // Handle search from URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery && window.location.pathname.includes('shop.html')) {
        setTimeout(() => {
            const filtered = allProducts.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
            renderProducts(filtered);
        }, 500);
    }
}

// --- Scroll Reveal Logic ---
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    reveals.forEach(reveal => observer.observe(reveal));
    
    // Quick check for elements already in view
    reveals.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            el.classList.add('active');
        }
    });
}

// --- Parallax Logic ---
function initParallax() {
    const parallaxItems = document.querySelectorAll('.parallax');
    window.addEventListener('scroll', () => {
        const offset = window.pageYOffset;
        parallaxItems.forEach(item => {
            const speed = 0.5;
            item.style.transform = `translateY(${offset * speed}px)`;
        });
    });
}

// --- Quick Reply Logic ---
async function sendQuickReply(text) {
    addChatMessage('user', text);
    
    // Simple local logic for quick replies
    let reply = "I'll look into that for you immediately.";
    if (text === 'Size Guide') reply = "You may view our detailed Sizing & Fit guide within any product detail page. For bespoke inquiries, our atelier remains at your disposal.";
    if (text === 'Track My Order') reply = "Please provide your order reference (e.g., EP-12345), and I will retrieve the status of your shipment from our concierge database.";
    if (text === 'New Arrivals') {
        reply = "Our Autumn/Winter 2026 collection has just arrived. Shall I escort you to the New Arrivals section?";
        setTimeout(() => window.location.href = 'shop.html', 2000);
    }

    setTimeout(() => addChatMessage('bot', reply), 600);
}

// --- Newsletter Logic ---
function setupNewsletter() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        if (input.value) {
            // Simulated success
            const successMsg = document.createElement('p');
            successMsg.className = 'newsletter-success';
            successMsg.innerText = 'Welcome to the circle. A confirmation has been sent.';
            successMsg.style.display = 'block';
            form.after(successMsg);
            form.style.display = 'none';
        }
    });
}
