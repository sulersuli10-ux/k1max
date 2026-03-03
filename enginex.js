// enginex.js - FULL INTEGRATED LOGISTICS ENGINE
// ==========================================

function calculateSea() {
    if (!window.ENGINEX_ACCESS) {
        console.log("🚫 Enginex locked (Sea)");
        return;
    }
    if (!window.enginex) return;
    const results = enginex.calculate('sea');
    enginex.updateResultsTable('sea', results);
}

function calculateAir() {
    if (!window.ENGINEX_ACCESS) {
        console.log("🚫 Enginex locked (Air)");
        return;
    }
    if (!window.enginex) return;
    const results = enginex.calculate('air');
    enginex.updateResultsTable('air', results);
}

const enginex = {
    /* =================================
       CORE UTILITIES
    ================================== */
    formatMoney: function(amount) {
        if (amount === undefined || amount === null) return "0";
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    
    getInputs: function(calculatorType) {
        const prefix = calculatorType === 'sea' ? 'sea' : 
                      calculatorType === 'air' ? 'air' : 'container';
        
        const getValue = (selector, defaultValue = 0) => {
            const element = document.getElementById(selector);
            if (!element) return defaultValue;
            const parentSelect = element.closest('.custom-select');
            if (parentSelect && parentSelect.dataset.selectedValue !== undefined) {
                const selected = parentSelect.dataset.selectedValue;
                return selected === '' || selected === undefined ? 0 : parseFloat(selected) || 0;
            }
            const value = element.value;
            if (value === '' || value === undefined || value === null) return defaultValue;
            const match = value.toString().match(/(\d+(\.\d+)?)/);
            return match ? parseFloat(match[1]) || 0 : 0;
        };
        
        return {
            length: parseFloat(document.getElementById(`${prefix}-length`)?.value) || 0,
            width: parseFloat(document.getElementById(`${prefix}-width`)?.value) || 0,
            height: parseFloat(document.getElementById(`${prefix}-height`)?.value) || 0,
            weight: parseFloat(document.getElementById(`${prefix}-actualWeight`)?.value) || 0,
            cubicDivisor: parseFloat(document.getElementById(`${prefix}-cubicDivisor`)?.value) || 6000,
            quantity: parseInt(document.getElementById(`${prefix}-numberOfPieces`)?.value) || 0,
            pieceCheckbox: document.getElementById(`${prefix}-pieceCheckbox`)?.checked || false,
            buyPrice: parseFloat(document.getElementById(`${prefix}-pricePerPiece`)?.value) || 0,
            sellPrice: parseFloat(document.getElementById(`${prefix}-sellingPricePerPiece`)?.value) || 0,
            pricePerCBM: getValue(`${prefix}-pricePerCBM-input`),
            pricePerKG: getValue(`${prefix}-pricePerKG-input`),
            exchangeRate: parseFloat(document.getElementById(`${prefix}-exchangeRateValue`)?.value) || 1,
            masterWord: (document.getElementById(`${prefix}-exchangeRateWord`)?.value?.toUpperCase()) || 'UGX',
            dutyRate: getValue(`${prefix}-customsDutyRate-input`),
            vatRate: getValue(`${prefix}-vatRate-input`),
            insuranceRate: parseFloat(document.getElementById(`${prefix}-insurance`)?.value) || 0.3,
            withholdingRate: parseFloat(document.getElementById(`${prefix}-withHoldingFees`)?.value) || 0,
            levyRate: parseFloat(document.getElementById(`${prefix}-infrastructureLevy`)?.value) || 0,
            handlingFees: parseFloat(document.getElementById(`${prefix}-handlingFees`)?.value) || 0,
            extraTax: parseFloat(document.getElementById(`${prefix}-ExtraTax`)?.value) || 0
        };
    },
    
    /* =================================
       MAIN CALCULATION LOGIC
    ================================== */
    calculate: function(calculatorType) {
        // 🔒 HARD GUARD: Block calculations if access is false
        if (!window.ENGINEX_ACCESS) {
            console.log("🚫 Core engine blocked");
            return {};
        }
        
        const inputs = this.getInputs(calculatorType);
        const results = {};
        const lengthM = inputs.length / 100;
        const widthM = inputs.width / 100;
        const heightM = inputs.height / 100;
        
        results.volumePerPiece = lengthM * widthM * heightM;
        results.totalVolume = inputs.pieceCheckbox ? results.volumePerPiece * inputs.quantity : results.volumePerPiece;
        
        if (calculatorType === 'air') {
            results.volumetricWeight = (inputs.length * inputs.width * inputs.height) / inputs.cubicDivisor;
            results.chargeableWeight = Math.max(inputs.weight || 0, results.volumetricWeight);
            if (inputs.pieceCheckbox) results.chargeableWeight *= inputs.quantity;
            results.displayActualWeight = inputs.pieceCheckbox ? inputs.weight * inputs.quantity : inputs.weight;
            results.displayVolumetricWeight = inputs.pieceCheckbox ? results.volumetricWeight * inputs.quantity : results.volumetricWeight;
            results.totalWeight = results.chargeableWeight;
        }
        
        results.shippingCostUSD = (calculatorType === 'air') ? results.totalWeight * inputs.pricePerKG : results.totalVolume * inputs.pricePerCBM;
        results.totalValueUSD = inputs.buyPrice * inputs.quantity;
        results.valueLocal = results.totalValueUSD * inputs.exchangeRate;
        results.shippingCostLocal = results.shippingCostUSD * inputs.exchangeRate;
        results.insuranceCostUSD = results.totalValueUSD * (inputs.insuranceRate / 100);
        results.insuranceCostLocal = results.insuranceCostUSD * inputs.exchangeRate;
        results.totalCustomsValueUSD = results.totalValueUSD + results.shippingCostUSD + results.insuranceCostUSD;
        results.customsValueLocal = results.totalCustomsValueUSD * inputs.exchangeRate;
        results.customsDuty = results.customsValueLocal * (inputs.dutyRate / 100);
        results.vatBase = results.customsValueLocal + results.customsDuty;
        results.vat = results.vatBase * (inputs.vatRate / 100);
        results.withholdingTax = results.customsValueLocal * (inputs.withholdingRate / 100);
        results.infrastructureLevy = results.customsValueLocal * (inputs.levyRate / 100);
        results.extraTax = results.customsValueLocal * (inputs.extraTax / 100);
        results.totalAdditionalCosts = results.customsDuty + results.vat + results.withholdingTax + results.infrastructureLevy + results.extraTax;
        results.totalCostLocal = results.valueLocal + results.shippingCostLocal + results.totalAdditionalCosts + inputs.handlingFees;
        results.totalCostUSD = results.totalCostLocal / inputs.exchangeRate;
        results.costPerPiece = inputs.quantity > 0 ? results.totalCostLocal / inputs.quantity : 0;
        results.profitPerPiece = inputs.sellPrice - results.costPerPiece;
        results.totalProfit = results.profitPerPiece * inputs.quantity;
        results.totalProfitUSD = results.totalProfit / inputs.exchangeRate;
        results.roi = results.totalCostLocal > 0 ? (results.totalProfit / results.totalCostLocal) : 0;
        
        // Add all input values to results for access in UI rendering
        Object.assign(results, inputs);
        return results;
    },

    /* =================================
       UI RENDERING & TABLES
    ================================== */
    generateResultRows: function(calculatorType, results) {
        const rows = [];
        const word = results.masterWord;
        const lWord = word.toLowerCase();

        if (calculatorType === 'sea') {
            rows.push(
                `<tr data-category="logistics"><td>📍 Size 1 pc</td><td class="has-formula" data-formula="Size = Length x Width x Height (in meters)">${results.volumePerPiece.toFixed(6)} m³</td></tr>`,
                `<tr data-category="logistics"><td>📦 Total (CBM)</td><td class="has-formula" data-formula="Total = Size per item x Quantity">${results.totalVolume.toFixed(3)} m³</td></tr>`,
                `<tr data-category="logistics"><td>💲 Shipping <small>@ ${results.pricePerCBM}</small>  ⬇️</td><td class="has-formula" data-formula="Shipping = Total CBM x Price per CBM">${results.shippingCostUSD.toFixed(2)} 💲</td></tr>`,
                `<tr data-category="logistics"><td>🚢 Shipping Cost =</td><td class="has-formula" data-formula="${word} = USD x Rate (${word})">${this.formatMoney(results.shippingCostLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="purchase"><td>💲 Purchase (FOB)⬇️</td><td class="has-formula" data-formula="Cost = Price x Quantity">${results.totalValueUSD.toFixed(2)} 💲</td></tr>`,
                `<tr data-category="purchase"><td>🏧 Purchase (${word}) =</td><td class="has-formula" data-formula="${word} = USD x Rate (${word})">${this.formatMoney(results.valueLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="purchase"><td>🛡️ Insurance @ ${results.insuranceRate}%</td><td class="has-formula" data-formula="Insurance = (Value + Shipping) × Insurance Rate">${this.formatMoney(results.insuranceCostLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="purchase"><td>📊 Customs CIF</td><td class="has-formula" data-formula="CIF = (Value + Shipping + Insurance)">${this.formatMoney(results.customsValueLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>🧾 Import Duty @ ${results.dutyRate}%</td><td class="has-formula" data-formula="Duty = CIF × Duty Rate">${this.formatMoney(results.customsDuty.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>🧾 VAT @ ${results.vatRate}%</td><td class="has-formula" data-formula="VAT = (CIF + Duty) × VAT Rate">${this.formatMoney(results.vat.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>📄 Withholding Tax @ ${results.withholdingRate}%</td><td class="has-formula" data-formula="W/Tax = CIF × W/Tax Rate">${this.formatMoney(results.withholdingTax.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>📄 Infrastructure Levy @ ${results.levyRate}%</td><td class="has-formula" data-formula="Levy = CIF × Levy Rate">${this.formatMoney(results.infrastructureLevy.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>📄 Extra Tax @ ${results.extraTax}%</td><td class="has-formula" data-formula="Extra Tax = CIF × Extra Tax Rate">${this.formatMoney(results.extraTax.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>📄 Taxes & Fees</td><td class="has-formula" data-formula="Total Taxes = Duty + VAT + W/Tax + Levy + Extra Tax">${this.formatMoney(results.totalAdditionalCosts.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>🏗️ Handling Fees</td><td>${this.formatMoney(results.handlingFees.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💸 Total Cost</td><td class="has-formula" data-formula="Total Cost = CIF + Taxes + Handling Fees">${this.formatMoney(results.totalCostLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💰 Cost per piece</td><td class="has-formula" data-formula="Cost 1 pc = Total Cost ÷ Quantity">${this.formatMoney(results.costPerPiece.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💰 Profit 1 pc</td><td class="has-formula" data-formula="Profit 1 pc = Selling 1 pc - Cost 1 pc">${this.formatMoney(results.profitPerPiece.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💴 Total Profit</td><td class="has-formula" data-formula="Total Profit = Profit 1 pc × Quantity">${this.formatMoney(results.totalProfit.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>👍 R.O.I</td><td class="has-formula" data-formula="ROI = Total Profit ÷ Total Cost">1:${results.roi.toFixed(2)}</td></tr>`
            );
        } else if (calculatorType === 'air') {
            rows.push(
                `<tr data-category="logistics"><td>⚖️ Actual Weight</td><td class="has-formula" data-formula="Actual Weight = Weight per piece × Quantity">${results.displayActualWeight.toFixed(2)} Kg</td></tr>`,
                `<tr data-category="logistics"><td>📦 Volumetric Weight</td><td class="has-formula" data-formula="Volumetric Weight = (L×W×H) ÷ Divisor">${results.displayVolumetricWeight.toFixed(2)} Kg</td></tr>`,
                `<tr data-category="logistics"><td>✅ Chargeable Weight</td><td class="has-formula" data-formula="Chargeable = Max(Actual, Volumetric)">${results.totalWeight.toFixed(2)} Kg</td></tr>`,
                `<tr data-category="logistics"><td>✈️ Shipping Cost</td><td class="has-formula" data-formula="Shipping = Chargeable Weight × Price per KG">${this.formatMoney(results.shippingCostLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="purchase"><td>💲 Purchase (FOB)</td><td class="has-formula" data-formula="Cost = Price × Quantity">${results.totalValueUSD.toFixed(2)} 💲</td></tr>`,
                `<tr data-category="purchase"><td>🛡️ Insurance @ ${results.insuranceRate}%</td><td class="has-formula" data-formula="Insurance = Value × Insurance Rate">${this.formatMoney(results.insuranceCostLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="purchase"><td>📊 Customs CIF</td><td class="has-formula" data-formula="CIF = Value + Shipping + Insurance">${this.formatMoney(results.customsValueLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>🧾 Import Duty @ ${results.dutyRate}%</td><td class="has-formula" data-formula="Duty = CIF × Duty Rate">${this.formatMoney(results.customsDuty.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>🧾 VAT @ ${results.vatRate}%</td><td class="has-formula" data-formula="VAT = (CIF + Duty) × VAT Rate">${this.formatMoney(results.vat.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>📄 Withholding Tax @ ${results.withholdingRate}%</td><td class="has-formula" data-formula="W/Tax = CIF × W/Tax Rate">${this.formatMoney(results.withholdingTax.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>📄 Infrastructure Levy @ ${results.levyRate}%</td><td class="has-formula" data-formula="Levy = CIF × Levy Rate">${this.formatMoney(results.infrastructureLevy.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="taxes"><td>🧾 Taxes & Fees</td><td class="has-formula" data-formula="Total Taxes = Duty + VAT + W/Tax + Levy">${this.formatMoney((results.totalAdditionalCosts).toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>🏗️ Handling Fees</td><td>${this.formatMoney(results.handlingFees.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💸 TOTAL COST</td><td class="has-formula" data-formula="Total Cost = CIF + Taxes + Handling Fees">${this.formatMoney(results.totalCostLocal.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💰 Cost per piece</td><td class="has-formula" data-formula="Cost 1 pc = Total Cost ÷ Quantity">${this.formatMoney(results.costPerPiece.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>💴 TOTAL PROFIT</td><td class="has-formula" data-formula="Total Profit = (Selling Price - Cost per piece) × Quantity">${this.formatMoney(results.totalProfit.toFixed(0))} <small>${lWord}</small></td></tr>`,
                `<tr data-category="totals"><td>👍 R.O.I</td><td class="has-formula" data-formula="ROI = Total Profit ÷ Total Cost">1:${results.roi.toFixed(2)}</td></tr>`
            );
        }
        return rows;
    },
    
    updateResultsTable: function(calculatorType, results) {
        const tableBody = document.getElementById(`${calculatorType}-resultsBody`);
        if (!tableBody) return;
        tableBody.innerHTML = this.generateResultRows(calculatorType, results).join('');
        
        // Add formula display functionality
        tableBody.addEventListener('click', function(e) {
            const formulaCell = e.target.closest('.has-formula');
            if (formulaCell && window.showFormula) {
                window.showFormula(formulaCell.dataset.formula);
                e.stopPropagation();
            }
        });
        
        if (window.generateAiAdvice) {
            generateAiAdvice(results.roi, calculatorType);
        }
        this.updateCharts(calculatorType, results);
        if (calculatorType === 'sea') {
            this.updateSeaPackaging(results);
        }

        // Update table header if exists
        const tableHeader = document.getElementById(`${calculatorType}-resultsHeader`)?.querySelector('th');
        if (tableHeader && calculatorType === 'sea') {
            tableHeader.textContent = `Item @ $ ${this.formatMoney(results.buyPrice.toFixed(2))} for ${this.formatMoney(results.quantity)} pcs`;
        }
    },

    updateCharts: function(calculatorType, results) {
        const chartData = {
            bar: {
                values: [results.valueLocal, results.shippingCostLocal, results.totalAdditionalCosts, results.totalCostLocal, results.totalProfit],
                labels: ['Cost', 'Shipping', 'Taxes', 'Total Cost', 'Profit'],
                colors: ['green', 'pink', '#8B0000', '#EDE7C7', results.totalProfit >= 0 ? 'darkorange' : 'red']
            },
            circular: [
                { label: 'Cost', value: results.valueLocal, color: 'green' },
                { label: 'Shipping', value: results.shippingCostLocal, color: 'pink' },
                { label: 'Taxes', value: results.totalAdditionalCosts, color: '#8B0000' },
                { label: 'Total Cost', value: results.totalCostLocal, color: '#EDE7C7' },
                { label: 'Profit', value: results.totalProfit, color: results.totalProfit >= 0 ? 'darkorange' : 'red' }
            ]
        };
        
        if (window.renderTransportCharts) {
            renderTransportCharts(calculatorType, chartData);
        }
        
        const roiBox = document.getElementById(`${calculatorType}RoiBox`);
        if (roiBox) {
            roiBox.textContent = `ROI 1:${results.roi.toFixed(2)}`;
            roiBox.style.background = results.roi > 5 ? 'linear-gradient(45deg, gold, orange)' :
                                     results.roi > 2 ? 'green' :
                                     results.roi > 0.5 ? 'orange' : 'red';
        }
    },

    /* =================================
       SEA PACKAGING (COMPLETE LOGIC FROM 2SEACALCULATOR)
    ================================== */
    updateSeaPackaging: function(results) {
        // Define standard container capacities (in CBM) - exact from 2seaCalculator.js
        const CONTAINER_CAPACITIES = {
            '20ft': 33,
            '40ft': 67,
            '40HQ': 76
        };
        
        const totalVolume = results.totalVolume;
        const content = document.getElementById('sea-packaging-content');
        if (!content) return;

        // Generate comparison data exactly as in 2seaCalculator.js
        const comparisonData = {};
        Object.keys(CONTAINER_CAPACITIES).forEach(cType => {
            const capacity = CONTAINER_CAPACITIES[cType];
            const efficiency = (totalVolume / capacity) * 100;
            comparisonData[cType] = {
                capacity: `${capacity} m³`,
                totalVolume: `${totalVolume.toFixed(3)} m³`,
                efficiency: `${efficiency.toFixed(1)}%`,
            };
        });

        // Create indicators exactly as in 2seaCalculator.js
        const indicator20ft = (totalVolume > 0 && totalVolume <= CONTAINER_CAPACITIES['20ft']) ? '✅' : '❌';
        const indicator40ft = (totalVolume > 0 && totalVolume <= CONTAINER_CAPACITIES['40ft']) ? '✅' : '❌';
        const indicator40HQ = (totalVolume > 0 && totalVolume <= CONTAINER_CAPACITIES['40HQ']) ? '✅' : '❌';

        // Build the exact HTML structure from 2seaCalculator.js
        const overviewRows = `
            <table class="inner-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>20ft</th>
                        <th>40ft</th>
                        <th>40HQ</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Capacity (m³)</td>
                        <td>${comparisonData['20ft'].capacity}</td>
                        <td>${comparisonData['40ft'].capacity}</td>
                        <td>${comparisonData['40HQ'].capacity}</td>
                    </tr>
                    <tr>
                        <td>Your Volume (m³)</td>
                        <td>${comparisonData['20ft'].totalVolume}</td>
                        <td>${comparisonData['40ft'].totalVolume}</td>
                        <td>${comparisonData['40HQ'].totalVolume}</td>
                    </tr>
                    <tr>
                        <td>Container Full</td>
                        <td style="color: ${parseFloat(comparisonData['20ft'].efficiency) < 50 ? 'red' : parseFloat(comparisonData['20ft'].efficiency) < 80 ? 'orange' : 'green'}">
                            ${comparisonData['20ft'].efficiency}
                        </td>
                        <td style="color: ${parseFloat(comparisonData['40ft'].efficiency) < 50 ? 'red' : parseFloat(comparisonData['40ft'].efficiency) < 80 ? 'orange' : 'green'}">
                            ${comparisonData['40ft'].efficiency}
                        </td>
                        <td style="color: ${parseFloat(comparisonData['40HQ'].efficiency) < 50 ? 'red' : parseFloat(comparisonData['40HQ'].efficiency) < 80 ? 'orange' : 'green'}">
                            ${comparisonData['40HQ'].efficiency}
                        </td>
                    </tr>
                </tbody>
            </table>
            <br>
            <table class="inner-table">
                <thead>
                    <tr>
                        <th>Shipment</th>
                        <th>20ft</th>
                        <th>40ft</th>
                        <th>40HQ</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Full (${results.quantity} pcs)</td>
                        <td>${indicator20ft}</td>
                        <td>${indicator40ft}</td>
                        <td>${indicator40HQ}</td>
                    </tr>
                </tbody>
            </table>
        `;
        
        content.innerHTML = overviewRows;
        
        // Add timestamp footer (matching 2seaCalculator.js style)
        const now = new Date();
        const footerRow = document.createElement('div');
        footerRow.style = 'text-align: center; font-size: 0.8em; color: #ccc; margin-top: 10px;';
        footerRow.innerHTML = `
            <hr>
            Exchange Rate (USD to ${results.masterWord}): 1💲 = ${results.exchangeRate} ${results.masterWord}<br>
            Calculation Timestamp: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}
        `;
        content.appendChild(footerRow);
    },

    /* =================================
       PACKAGING UI CONTROL
    ================================== */
    initSeaPackagingUI: function() {
        const popup = document.getElementById('sea-packaging-plan');
        const toggle = document.getElementById('sea-packaging-toggle');
        if (!popup || !toggle) return;

        const show = () => {
    popup.style.display = 'block';

    // If no calculation yet, render empty packaging safely
    const table = document.getElementById('sea-resultsBody');
    if (!table || table.innerHTML.trim() === "") {
        enginex.updateSeaPackaging({
            totalVolume: 0,
            quantity: 0,
            masterWord: 'UGX',
            exchangeRate: 1
        });
    }
};
        const hide = () => popup.style.display = 'none';

        toggle.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            show(); 
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#sea-packaging-plan') && e.target.id !== 'sea-packaging-toggle') hide();
        });
        
        document.addEventListener('scroll', hide);
    },

    init: function() {
        this.initSeaPackagingUI();
    }
};

window.enginex = enginex;
document.addEventListener('DOMContentLoaded', () => enginex.init());