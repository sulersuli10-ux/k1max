

// frontend.js - MINIMAL
// =====================

function scrollToResults() {
    ['seaResults', 'airResults', 'containerResults'].forEach(section => {
        const element = document.querySelector(`a[name="${section}"]`);
        if (element) element.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
}

function runCalculations() {
    if (typeof calculateSea === 'function') calculateSea();
    if (typeof calculateAir === 'function') calculateAir();
    if (typeof calculateContainer === 'function') calculateContainer();
    scrollToResults();
}

// Auto-run when results tables are clicked
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sea-results-table, .air-results-table, .container-results-table').forEach(table => {
        table.addEventListener('click', runCalculations);
    });
});

// Calculator Selection
let currentCalculator = 'sea';

function showCalculator(type) {
    currentCalculator = type;
    document.querySelectorAll('.calculator').forEach(calc => {
        calc.classList.remove('active');
    });
    const calculator = document.getElementById(`${type}Calculator`);
    if (calculator) calculator.classList.add('active');
}

// Message Display
function displayHeaderMessage(message, calculatorType) {
    const messageBox = document.getElementById(`${calculatorType}HeaderMessageDisplay`);
    if (!messageBox) return;
    
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.classList.remove('show');
    
    setTimeout(() => messageBox.classList.add('show'), 10);
    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => messageBox.style.display = 'none', 500);
    }, 4000);
}

// Chart Functions
function drawBarChart(canvasId, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    
    const ctx = canvas.getContext('2d');
    const barWidth = 40;
    const maxHeight = Math.max(...data);
    const scaleFactor = (canvas.height - 0) / (maxHeight || 1);
    const xStart = 50;
    const barSpacing = (data.length > 1) ? (canvas.width - 2 * xStart - data.length * barWidth) / (data.length - 1) : 0;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (data.length === 0 || maxHeight === 0) return;
    
    data.forEach((value, index) => {
        const barHeight = value * scaleFactor;
        const x = xStart + (barWidth + barSpacing) * index;
        const y = canvas.height - barHeight - 0;
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);
    });
}

function drawCircularChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    let startAngle = -Math.PI / 2;
    const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (totalValue <= 0) return;
    
    data.forEach(slice => {
        const proportion = slice.value / totalValue;
        const angle = Math.PI * 2 * proportion;
        const endAngle = startAngle + angle;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = slice.color;
        if (slice.label === 'Profit' && slice.value < 0) ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
        startAngle = endAngle;
    });
}

// Unified Chart Handler
function renderTransportCharts(chartType, chartData) {
    drawBarChart(`${chartType}BarChart`, chartData.bar.values, chartData.bar.colors);
    updateBarLabelsWithPercentages(`${chartType}BarChart`, chartData.bar.labels, chartData.bar.colors, chartData.bar.values);
    drawCircularChart(`${chartType}CircularChart`, chartData.circular);
}

// Percentage Generator
function generatePercentages(values) {
    const totalCostIndex = values.length - 2;
    const total = values[totalCostIndex];
    if (!total || total <= 0) return values.map(() => '');
    return values.map((value, index) => {
        if (index === totalCostIndex) return '100%';
        const percentage = (value / total) * 100;
        return isNaN(percentage) ? '' : `${percentage.toFixed(1)}%`;
    });
}

// Unified Label Display
function updateBarLabelsWithPercentages(containerId, labels, colors, values) {
    const container = document.querySelector(`#${containerId}`)?.parentNode?.querySelector('.bar-labels-container');
    if (!container) return;
    
    container.innerHTML = '';
    const percentages = generatePercentages(values);
    
    labels.forEach((label, index) => {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'bar-label';
        labelDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 0 5px;';
        
        const percentText = document.createElement('span');
        percentText.textContent = percentages[index];
        percentText.style.cssText = `font-size: 1.1em; font-weight: bold; color: ${colors[index]}; margin-bottom: 2px;`;
        
        const labelText = document.createElement('span');
        labelText.textContent = label;
        labelText.style.cssText = `font-size: 0.9em; font-weight: 600; color: ${colors[index]};`;
        
        labelDiv.appendChild(percentText);
        labelDiv.appendChild(labelText);
        container.appendChild(labelDiv);
    });
}

// AI Advice
function generateAiAdvice(roi, calculatorType) {
    const aiAdviceBox = document.getElementById(`${calculatorType}AiAdvice`);
    if (!aiAdviceBox) return;
    
    roi = parseFloat(roi) || 0;
    const roiDisplay = roi >= 0 ? roi.toFixed(1) + "×" : "Negative";
    let advicePoints = [];
    let businessCategory = "";
    let starRating = "";
    
    if (roi >= 10) {
        starRating = "🌟🌟🌟🌟🌟";
        businessCategory = "Legendary Performance | 5/5";
        advicePoints = ["Negotiate shipping aggressively", "Demand supplier discounts", "Add premium tiers"];
    } else if (roi >= 5) {
        starRating = "🌟🌟🌟🌟";
        businessCategory = "Elite Performance | 4/5";
        advicePoints = ["Get volume discounts", "Ask for 5-7% supplier discounts", "Add mid-tier products"];
    } else if (roi >= 3) {
        starRating = "🌟🌟🌟";
        businessCategory = "Strong Performance | 3/5";
        advicePoints = ["Approach carriers for discounts", "Request prompt payment discounts", "Clear old stock"];
    } else if (roi >= 1) {
        starRating = "🌟🌟";
        businessCategory = "Developing | 2/5";
        advicePoints = ["Compare carrier rates", "Ask for cash upfront discounts", "Raise prices modestly"];
    } else if (roi > 0) {
        starRating = "🌟";
        businessCategory = "Marginal | 1/5";
        advicePoints = ["Switch to cheapest shipping", "Demand emergency discounts", "Implement price increases"];
    } else if (roi === 0) {
        businessCategory = "Starting | Rating Pending";
        advicePoints = ["Get shipping quotes", "Ask for new business discounts", "Price for survival first"];
    } else {
        businessCategory = "Emergency | 0/5";
        advicePoints = ["Stop non-essential shipping", "Beg for extended payment terms", "Increase prices 20%+"];
    }
    
    aiAdviceBox.innerHTML = `
        <div class="ai-advice-header">
            <div class="ai-category">${businessCategory}</div>
            <div class="ai-stars">${starRating}</div>
            <div class="ai-roi">ROI ${roiDisplay}</div>
        </div>
        <div class="ai-advice-content">
            ${advicePoints.slice(0, 4).map(point => `<div class="ai-message">• ${point}</div>`).join('')}
            ${advicePoints.length > 4 ? `<div class="ai-more-tips">↕ ${advicePoints.length - 4} more tips</div>` : ''}
        </div>
        <div class="ai-footer">💡 Tap to adjust strategy</div>
    `;
    
    aiAdviceBox.style.cursor = 'pointer';
    aiAdviceBox.onclick = function() {
        const calculator = document.getElementById(`${calculatorType}Calculator`);
        if (calculator) calculator.scrollIntoView({ behavior: 'smooth' });
    };
    aiAdviceBox.style.display = 'block';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Piece checkbox handlers
    const seaPieceCheckbox = document.getElementById('sea-pieceCheckbox');
    if (seaPieceCheckbox) {
        seaPieceCheckbox.addEventListener('change', function() {
            displayHeaderMessage(
                this.checked ? "Size     X    Quantity.      🚮 #pcs" : "Size for a     full box.       🛄",
                'sea'
            );
        });
    }
    
    const airPieceCheckbox = document.getElementById('air-pieceCheckbox');
    if (airPieceCheckbox) {
        airPieceCheckbox.addEventListener('change', function() {
            displayHeaderMessage(
                this.checked ? "Multiplying size by quantity #pcs" : "Size is for packaged box #BOX",
                'air'
            );
        });
    }
    
    // Initialize UI
    showCalculator('sea');
});