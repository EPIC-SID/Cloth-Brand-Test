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
        allProducts = await response.json();
        renderProducts(allProducts);
        setupFilters();
    } catch (error) {
        console.error('Fetch products error:', error);
    }
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
                <img src="${API_BASE}/${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1539109132304-351ae3f3ad67?auto=format&fit=crop&q=80&w=800'">
                <button class="wishlist-btn ${isWishlisted(product.id) ? 'active' : ''}" onclick="toggleWishlist(event, ${product.id})">
                    <i class="${isWishlisted(product.id) ? 'fas' : 'far'} fa-heart"></i>
                </button>
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
            <img id="modal-main-image" src="${API_BASE}/${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1539109132304-351ae3f3ad67?auto=format&fit=crop&q=80&w=800'">
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

            <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" onclick="addToCart(${product.id})">Add to Collection</button>
        </div>
    `;

    currentProduct = product;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
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
            document.getElementById('modal-main-image').src = `${API_BASE}/${newImage}`;
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
                    <img src="${API_BASE}/${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1539109132304-351ae3f3ad67?auto=format&fit=crop&q=80&w=800'">
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
    e.stopPropagation();
    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
    } else {
        wishlist.push(productId);
    }
    localStorage.setItem('elan_prive_wishlist', JSON.stringify(wishlist));
    
    // UI Update (Quick toggle class)
    const btn = e.currentTarget;
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    icon.classList.toggle('fas');
    icon.classList.toggle('far');
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
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(reveal => observer.observe(reveal));
}
