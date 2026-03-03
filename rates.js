// rates.js - ULTRA SMART with instant auto-select when one product remains
// =========================================================================

let TAX_DATA_CACHE = {};

const products = [
    {code:'847130', name:'💻 Laptop', group:'a1'},
    {code:'851712', name:'📱 Phone', group:'a2'},
    {code:'852872', name:'📺 TV', group:'a3'},
    {code:'844332', name:'🖨️ Printer', group:'a4'},
    {code:'851830', name:'🎧 Headphones', group:'a5'},
    {code:'854442', name:'🔗 Cables', group:'a6'},
    {code:'850760', name:'🔋 Battery', group:'a7'},
    {code:'853949', name:'💡 LED Bulb', group:'a8'},
    {code:'851631', name:'💇 Hair Dryer', group:'a9'},
    {code:'610510', name:'👕 Shirt', group:'b1'},
    {code:'620342', name:'👖 Pants', group:'b2'},
    {code:'611030', name:'🧶 Sweater', group:'b3'},
    {code:'620443', name:'👗 Dress', group:'b4'},
    {code:'630231', name:'🛏️ Bed Linen', group:'b5'},
    {code:'621210', name:'👙 Bra', group:'b6'},
    {code:'611595', name:'🧦 Socks', group:'b7'},
    {code:'620193', name:'🧥 Jacket', group:'b8'},
    {code:'610910', name:'👚 T-Shirt', group:'b9'},
    {code:'640391', name:'🥾 Shoes', group:'c1'},
    {code:'640411', name:'👟 Sneakers', group:'c2'},
    {code:'220300', name:'🍺 Beer', group:'d1'},
    {code:'090121', name:'☕ Coffee', group:'d2'},
    {code:'040221', name:'🥛 Milk', group:'d3'},
    {code:'170490', name:'🍬 Candy', group:'d4'},
    {code:'392321', name:'🛍️ Bags', group:'e1'},
    {code:'481910', name:'📦 Boxes', group:'e2'},
    {code:'940320', name:'🗄️ Furniture', group:'f1'},
    {code:'841810', name:'🧊 Fridge', group:'g1'},
    {code:'300490', name:'💊 Medicine', group:'h1'},
    {code:'870323', name:'🚘 Car', group:'i1'},
    {code:'950300', name:'🧸 Toy', group:'j1'},
    {code:'900410', name:'😎 Sunglasses', group:'j2'}
];

const CURRENCY_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_KEY = 'currency_cache';
const CACHE_TIME = 4 * 60 * 60 * 1000;

let TAX_MASTER_ARRAY = [0, 0, 0, 0, 0];
let countrySelected = false;
let messageTimer = null;
let searchTimeouts = {}; // For debouncing

const currencyList = [
    {code:'USD', name:'United States', flag:'🇺🇸', currency:'US Dollar'},
    {code:'EUR', name:'European Union', flag:'🇪🇺', currency:'Euro'},
    {code:'GBP', name:'United Kingdom', flag:'🇬🇧', currency:'British Pound'},
    {code:'UGX', name:'Uganda', flag:'🇺🇬', currency:'Ugandan Shilling'},
    {code:'KES', name:'Kenya', flag:'🇰🇪', currency:'Kenyan Shilling'},
    {code:'TZS', name:'Tanzania', flag:'🇹🇿', currency:'Tanzanian Shilling'},
    {code:'CNY', name:'China', flag:'🇨🇳', currency:'Chinese Yuan'},
    {code:'INR', name:'India', flag:'🇮🇳', currency:'Indian Rupee'},
    {code:'AED', name:'UAE', flag:'🇦🇪', currency:'UAE Dirham'},
    {code:'ZAR', name:'South Africa', flag:'🇿🇦', currency:'South African Rand'}
];

let exchangeRates = {};
let selectedCurrency = {code: 'UGX', rate: 3700, flag: '🇺🇬'};

async function initRates() {
    await loadRates();
    setupCurrencySelectors();
    setupProductSelectors();
}

async function loadRates() {
    try {
        const cached = getCachedRates();
        if (cached) { 
            exchangeRates = cached; 
        } else { 
            await fetchRates(); 
        }
    } catch (error) { 
        setDefaultRates(); 
    }
}

async function fetchRates() {
    try {
        const response = await fetch(CURRENCY_API);
        const data = await response.json();
        currencyList.forEach(currency => {
            exchangeRates[currency.code] = data.rates[currency.code] || 1;
        });
        cacheRates(exchangeRates);
        showStatus('✅ Rates updated', 'success');
    } catch (error) {
        setDefaultRates();
        showStatus('⚠️ Using default rates', 'warning');
    }
}

function getCachedRates() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const {data, timestamp} = JSON.parse(cached);
        return (Date.now() - timestamp < CACHE_TIME) ? data : null;
    } catch (e) { return null; }
}

function cacheRates(rates) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rates, timestamp: Date.now() })); } catch (e) {}
}

function setDefaultRates() {
    exchangeRates = { 'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'UGX': 3700, 'KES': 130, 'TZS': 2500, 'CNY': 7.2, 'INR': 83, 'AED': 3.67, 'ZAR': 19 };
}

function setupCurrencySelectors() {
    ['sea', 'air'].forEach(type => {
        const input = document.getElementById(`${type}-exchangeRateWord`);
        const selector = document.getElementById(`${type}-country-currency-selector`);
        const search = document.getElementById(`${type}-country-search`);
        
        if (input && selector) {
            input.addEventListener('focus', () => {
                selector.style.display = 'block';
                showCurrencyList(type);
                if (search) { 
                    search.value = ''; 
                    search.focus();
                }
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!selector.contains(e.target) && !input.contains(e.target)) {
                    selector.style.display = 'none';
                }
            });
        }

        if (search) {
            search.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const items = document.querySelectorAll(`#${type}-country-list .country-item`);
                let visibleItems = [];

                items.forEach(item => {
                    const isVisible = item.textContent.toLowerCase().includes(query);
                    item.style.display = isVisible ? 'block' : 'none';
                    if (isVisible) visibleItems.push(item);
                });

                // ULTRA SMART AUTO-SELECT - exactly like currency
                if (visibleItems.length === 1 && query.length > 0) {
                    const codeMatch = visibleItems[0].textContent.match(/\(([A-Z]{3})\)/);
                    if (codeMatch) {
                        const code = codeMatch[1];
                        selectCurrencyNow(code, exchangeRates[code] || 1, type);
                    }
                }
            });
        }
    });
}

function showCurrencyList(type) {
    const list = document.getElementById(`${type}-country-list`);
    if (!list) return;
    list.innerHTML = currencyList.map(c => `
        <div class="country-item" onclick="selectCurrencyNow('${c.code}', ${exchangeRates[c.code] || 1}, '${type}')" 
             style="padding: 10px; border-bottom: 1px solid #333; cursor: pointer; hover:background:#333;">
            <span style="font-size: 1.2em;">${c.flag}</span> ${c.name} (${c.code})
            <span style="float: right; font-weight: bold;">${(exchangeRates[c.code] || 1).toFixed(2)}</span>
        </div>
    `).join('');
}

function selectCurrencyNow(code, rate, fromType) {
    const currency = currencyList.find(c => c.code === code);
    selectedCurrency = {code, rate, flag: currency?.flag || '🏳️'};
    countrySelected = true; 
    
    ['sea', 'air'].forEach(type => {
        const wordInput = document.getElementById(`${type}-exchangeRateWord`);
        const valueInput = document.getElementById(`${type}-exchangeRateValue`);
        if (wordInput) wordInput.value = `${selectedCurrency.flag} ${code}`;
        if (valueInput) valueInput.value = rate.toFixed(2);
        const selector = document.getElementById(`${type}-country-currency-selector`);
        if (selector) selector.style.display = 'none';
    });

    // Preload tax data for selected currency
    loadTaxDataForCurrency(code.toLowerCase());
}

function setupProductSelectors() {
    ['', 'air-', 'container-'].forEach(prefix => setupProductSelector(prefix));
}

function setupProductSelector(prefix) {
    const searchBox = document.getElementById(`${prefix}product-category-search`);
    const dropdown = document.getElementById(`${prefix}product-category-selector`);
    const scroll = document.getElementById(`${prefix}hs-code-scroll`);
    const list = document.getElementById(`${prefix}product-category-list`);

    if (list) {
        list.innerHTML = products.map(p => `
            <div class="product-category-item" data-code="${p.code}" data-group="${p.group}" data-name="${p.name}"
                 onclick="selectProduct('${p.code}','${prefix}')">
                ${p.code} - ${p.name}
            </div>
        `).join('');
    }

    if (scroll) {
        scroll.innerHTML = products.map(p => `
            <div class="hs-code-item" data-code="${p.code}" data-group="${p.group}" data-name="${p.name}"
                 onclick="selectProduct('${p.code}','${prefix}')">
                ${p.name}
            </div>
        `).join('');
    }

    if (searchBox) {
        // Focus handler
        searchBox.addEventListener('focus', () => { 
            if (dropdown) dropdown.style.display = 'block'; 
        });

        // ULTRA SMART SEARCH with auto-select when one remains
        searchBox.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            // Clear previous timeout
            if (searchTimeouts[prefix]) {
                clearTimeout(searchTimeouts[prefix]);
            }

            // Filter items
            const items = document.querySelectorAll(`#${prefix}product-category-list .product-category-item`);
            let visibleItems = [];

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                const isVisible = text.includes(query);
                item.style.display = isVisible ? 'block' : 'none';
                if (isVisible) visibleItems.push(item);
            });

            // ULTRA SMART AUTO-SELECT - exactly like currency
            // When exactly one item remains visible, auto-select it!
            if (visibleItems.length === 1 && query.length > 0) {
                // Get the code from the single visible item
                const code = visibleItems[0].getAttribute('data-code');
                if (code) {
                    // Add a tiny delay to feel natural, but instant enough
                    searchTimeouts[prefix] = setTimeout(() => {
                        selectProduct(code, prefix);
                        // Close dropdown after selection
                        if (dropdown) dropdown.style.display = 'none';
                    }, 150); // 150ms feels instant but not jarring
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target) && !searchBox.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
}

async function loadTaxDataForCurrency(currencyCode) {
    const key = currencyCode.toLowerCase();

    if (TAX_DATA_CACHE[key]) {
        return TAX_DATA_CACHE[key];
    }

    try {
        const response = await fetch(
  `https://raw.githubusercontent.com/sulersuli10-ux/tax-box/main/data/${key}.json`
);
        if (!response.ok) throw new Error("Tax file not found");

        const data = await response.json();
        TAX_DATA_CACHE[key] = data;
        return data;

    } catch (err) {
        console.error("Failed to load tax data:", err);
        return null;
    }
}

// =========================================================================
// PRODUCT SELECTION FUNCTION - DYNAMIC JSON LOADING VERSION
// =========================================================================
window.selectProduct = function(code, prefix) {
    if (!countrySelected) {
        showMessage('🛑 Plug in destination country first 🌍', 'error', prefix);
        return;
    }

    const product = products.find(p => p.code === code);
    if (!product) return;

    const searchBox = document.getElementById(`${prefix}product-category-search`);
    if (searchBox) searchBox.value = product.name;
    
    const hsDisplay = document.getElementById(`${prefix}selected-hs-code-display`);
    if (hsDisplay) hsDisplay.value = code;

    const dropdown = document.getElementById(`${prefix}product-category-selector`);
    if (dropdown) dropdown.style.display = 'none';

    const scrollContainer = document.getElementById(`${prefix}hs-code-scroll`);
    if (scrollContainer) {
        scrollContainer.querySelectorAll('.hs-code-item').forEach(item => {
            const isSelected = item.getAttribute('data-code') === code;
            item.classList.toggle('selected', isSelected);
            if (isSelected) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    // DYNAMIC TAX LOAD from JSON files
    const currencyKey = selectedCurrency.code.toLowerCase();
    const categoryKey = product.group;
    const activeCurrency = currencyKey;

    loadTaxDataForCurrency(currencyKey).then(data => {
        // Ignore outdated fetch results (currency switched during load)
        if (selectedCurrency.code.toLowerCase() !== activeCurrency) {
            return;
        }

        if (
            !data ||
            !Array.isArray(data[categoryKey]) ||
            data[categoryKey].length !== 5
        ) {
            TAX_MASTER_ARRAY = [0, 0, 0, 0, 0];
            showMessage('❌ Auto-Tax injection. <span class="polite-green">Taxes cleared for your😀 Override 🕹️</span>', 'error', prefix);
            console.error(
                "Invalid tax structure:",
                currencyKey,
                categoryKey,
                data ? data[categoryKey] : null
            );
        } else {
            TAX_MASTER_ARRAY = Object.freeze([...data[categoryKey]]);
            showMessage(
    ` ${product.name.replace(/^[^\w]+/, '').toUpperCase()} Taxes Injected ✅`,
    'success',
    prefix
);
        }

        dispatchTaxUpdate(prefix);
    });
};

// =========================================================================
// TAX UPDATE FUNCTION
// =========================================================================
function dispatchTaxUpdate(prefix) {
    const fields = [
        'customsDutyRate-input',
        'vatRate-input',
        'withholdingTax-input',
        'infrastructureLevy-input',
        'idf-input'
    ];

    fields.forEach((id, index) => {
        const el = document.getElementById(`${prefix}${id}`);
        if (el) {
            el.value = TAX_MASTER_ARRAY[index];
            // Trigger input event for SmartInput to sync
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    window.dispatchEvent(new CustomEvent('taxMasterUpdated', { detail: TAX_MASTER_ARRAY }));

    // Single calculation trigger
    if (prefix.includes('air') && window.calculateAir) {
        window.calculateAir();
    } else if (window.calculateSea) {
        window.calculateSea();
    }
}

function showMessage(text, type, prefix) {
    const element = document.getElementById(`${prefix}tax-status-message`);
    const plates = document.querySelectorAll('.glassplate');

    if (!element) return;

    if (messageTimer) clearTimeout(messageTimer);

    element.innerHTML = text;

    element.className = type === 'error'
        ? 'statusmessag errormessag'
        : type === 'success'
            ? 'statusmessag successmessag'
            : 'statusmessag';

    // 🔥 Update ALL glassplates
    plates.forEach(plate => {
        plate.style.borderRight = type === 'error'
            ? '0.5px solid #ff4d4d'
            : '0.6px solid #34c759';
    });

    messageTimer = setTimeout(() => {
        element.innerHTML = '';
        element.className = 'statusmessag';
    }, 4000);
}

function showStatus(message, type) { 
    console.log(`[Status] ${type}: ${message}`); 
}

document.addEventListener('DOMContentLoaded', initRates);