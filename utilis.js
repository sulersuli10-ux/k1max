/**
 * SMART INPUT SYSTEM - Logic & Implementation
 * LOCK SAFE VERSION
 */

class SmartInput {
    constructor(id, label, unit, presets = [], masterIndex, containerId) {
        this.id = id;
        this.unit = unit;
        this.masterIndex = masterIndex;
        this.hasDropdown = presets && presets.length > 0;
        
        const existingInput = document.getElementById(id);

        if (existingInput) {
            // MODE: Bind to existing HTML
            this.input = existingInput;
            this.isManualOnly = true;
        } else {
            // MODE: Create new Dropdown UI
            this.isManualOnly = false;
            this.container = document.createElement('div');
            this.container.className = 'input-group';
            this.container.innerHTML = `
                <label for="${id}">${label}</label>
                <div class="custom-select">
                    <input type="text" class="custom-input ${this.hasDropdown ? 'has-arrow' : ''}" 
                           id="${id}" data-suffix="${unit}" placeholder="0${unit}">
                    ${this.hasDropdown ? `
                    <div class="custom-arrow">▼</div>
                    <div class="custom-options">
                        ${presets.map(p => `<div data-val="${p}">${p} ${unit}</div>`).join('')}
                    </div>` : ''}
                </div>`;
            
            const target = document.getElementById(containerId);
            if (target) target.appendChild(this.container);
            this.input = this.container.querySelector('input');
            if (this.hasDropdown) this.initDropdown();
        }

        this.initManual();
    }

    initDropdown() {
        const arrow = this.container.querySelector('.custom-arrow');
        const options = this.container.querySelector('.custom-options');

        arrow.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-options')
                .forEach(el => el.style.display = 'none');
            options.style.display = 'block';
        };

        options.querySelectorAll('div').forEach(opt => {
            opt.onclick = () => {
                this.setValue(opt.dataset.val);
                this.syncToMaster(opt.dataset.val);
            };
        });

        document.addEventListener('click', () => {
            options.style.display = 'none';
        });
    }

    initManual() {
        this.input.onfocus = () => { 
            if (!this.isManualOnly) {
                this.input.value = this.input.value.replace(/[^\d.]/g, '');
            }
        };

        this.input.onblur = () => { 
            if (this.input.value !== "") {
                this.setValue(this.input.value);
                this.syncToMaster(this.input.value);
            }
        };

        this.input.oninput = () => {
            const val = parseFloat(this.input.value) || 0;
            this.syncToMaster(val);
        };
    }

    setValue(val) {
        const num = parseFloat(val) || 0;

        // Do NOT append unit in manual-only fields
        this.input.value = this.isManualOnly ? num : num + this.unit;

        this.input.dataset.rawValue = num;
    }

    /**
     * 🔒 LOCK SAFE MASTER SYNC
     */
    syncToMaster(val) {
        const num = parseFloat(val) || 0;

        // If Enginex is locked, do NOT mutate master array
        if (window.ENGINEX_ACCESS !== true) {
            return;
        }

        if (
            typeof TAX_MASTER_ARRAY !== 'undefined' &&
            Array.isArray(TAX_MASTER_ARRAY) &&
            this.masterIndex !== undefined
        ) {
            TAX_MASTER_ARRAY[this.masterIndex] = num;

            // Trigger recalculation safely
            if (window.calculateSea) window.calculateSea();
            if (window.calculateAir) window.calculateAir();
        }
    }
}

const TaxManager = {

    instances: {},

    init() {

        // COMPLEX INPUTS (Dropdown based)
        this.create(
            'sea-pricePerCBM-input',
            'Price per CBM (💲):',
            ' usd',
            [180, 150, 100, 50, 200],
            undefined,
            'sea-pricePerCBM-container'
        );

        this.create(
            'sea-customsDutyRate-input',
            '🧾 Import Duty Rate:',
            '%',
            [10, 25, 35],
            0,
            'sea-tax-fields-main'
        );

        this.create(
            'sea-vatRate-input',
            '🧾 VAT Rate:',
            '%',
            [18, 15, 20],
            1,
            'sea-tax-fields-main'
        );

        // SIMPLE INPUTS (No dropdown)
        this.create('sea-withholdingTax-input', null, '%', null, 2);
        this.create('sea-infrastructureLevy-input', null, '%', null, 3);
        this.create('sea-idf-input', null, '%', null, 4);

        window.addEventListener('taxMasterUpdated', (e) => {
            this.applyMasterArray(e.detail);
        });
    },

    create(id, label, unit, presets, masterIndex, containerId) {
        const si = new SmartInput(id, label, unit, presets, masterIndex, containerId);
        this.instances[id] = si;
    },

    applyMasterArray(rates) {

        // If locked, do not attempt to update UI from engine
        if (window.ENGINEX_ACCESS !== true) return;

        const keys = [
            'sea-customsDutyRate-input', 
            'sea-vatRate-input', 
            'sea-withholdingTax-input', 
            'sea-infrastructureLevy-input',
            'sea-idf-input'
        ];

        keys.forEach((id, i) => {
            if (this.instances[id] && rates && rates[i] !== undefined) {
                this.instances[id].setValue(rates[i]);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => TaxManager.init());