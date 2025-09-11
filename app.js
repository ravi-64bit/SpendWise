// Cosmic UPI Tracker - Main Application JavaScript

class CosmicUPITracker {
    constructor() {
        this.expenses = this.loadExpenses();
        this.qrCodeReader = null;
        this.isScanning = false;
        
        this.init();
    }

    init() {
        // Initialize with sample data if empty
        if (this.expenses.length === 0) {
            this.initializeSampleData();
        }
        
        this.setupEventListeners();
        this.updateDashboard();
        this.updateAnalytics();
        this.setCurrentDate();
    }

    initializeSampleData() {
        const sampleData = [
            {
                id: 'exp_001',
                upiId: 'merchant@paytm',
                amount: 250.00,
                purpose: 'Food',
                customPurpose: 'Dinner at Restaurant',
                date: '2025-09-05',
                notes: 'Team dinner',
                status: 'paid',
                timestamp: Date.now() - 86400000
            },
            {
                id: 'exp_002',
                upiId: 'shop@bank',
                amount: 1500.75,
                purpose: 'Shopping',
                customPurpose: 'Grocery Shopping',
                date: '2025-09-04',
                notes: 'Monthly groceries',
                status: 'paid',
                timestamp: Date.now() - 172800000
            },
            {
                id: 'exp_003',
                upiId: 'transport@bank',
                amount: 45.50,
                purpose: 'Transport',
                customPurpose: 'Taxi Ride',
                date: '2025-09-03',
                notes: 'Airport transfer',
                status: 'pending',
                timestamp: Date.now() - 259200000
            }
        ];
        
        this.expenses = sampleData;
        this.saveExpenses();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.dataset.section);
            });
        });

        // QR Scanner
        const toggleScannerBtn = document.getElementById('toggle-scanner');
        if (toggleScannerBtn) {
            toggleScannerBtn.addEventListener('click', () => {
                this.toggleQRScanner();
            });
        }

        // Expense form
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleExpenseSubmit();
            });
        }

        // Edit form
        const editForm = document.getElementById('edit-expense-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateExpense();
            });
        }

        // Search
        const searchInput = document.getElementById('search-expenses');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterExpenses(e.target.value);
            });
        }

        // Payment app buttons
        document.querySelectorAll('.payment-app-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectPaymentApp(btn.dataset.app);
            });
        });

        // Generic pay button
        const payBtn = document.getElementById('generic-pay-btn');
        if (payBtn) {
            payBtn.addEventListener('click', () => {
                this.initiatePayment();
            });
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

        // Update analytics when switching to analytics section
        if (sectionName === 'analytics') {
            setTimeout(() => this.updateAnalytics(), 100);
        }
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        const expenseDateField = document.getElementById('expense-date');
        if (expenseDateField) {
            expenseDateField.value = today;
        }
    }

    // QR Code Scanner Functions
    async toggleQRScanner() {
        const toggleBtn = document.getElementById('toggle-scanner');
        const readerDiv = document.getElementById('qr-reader');
        
        if (!this.isScanning) {
            try {
                this.qrCodeReader = new Html5Qrcode("qr-reader");
                
                toggleBtn.innerHTML = '<i data-feather="camera-off"></i> Stop Scanner';
                toggleBtn.classList.add('btn--warning');
                readerDiv.style.display = 'block';
                
                await this.qrCodeReader.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (qrCodeMessage) => {
                        this.onQRCodeScanned(qrCodeMessage);
                    },
                    (errorMessage) => {
                        // Handle scan error silently
                    }
                );
                
                this.isScanning = true;
                feather.replace();
            } catch (err) {
                console.error('Error starting QR scanner:', err);
                this.showNotification('Failed to start camera. Please check permissions.', 'error');
            }
        } else {
            await this.stopQRScanner();
        }
    }

    async stopQRScanner() {
        const toggleBtn = document.getElementById('toggle-scanner');
        const readerDiv = document.getElementById('qr-reader');
        
        if (this.qrCodeReader && this.isScanning) {
            await this.qrCodeReader.stop();
            this.qrCodeReader = null;
        }
        
        toggleBtn.innerHTML = '<i data-feather="camera"></i> Start Scanner';
        toggleBtn.classList.remove('btn--warning');
        readerDiv.style.display = 'none';
        this.isScanning = false;
        feather.replace();
    }

    onQRCodeScanned(qrCodeMessage) {
        console.log('QR Code scanned:', qrCodeMessage);
        
        // Extract UPI ID from QR code
        const upiId = this.extractUPIId(qrCodeMessage);
        
        if (upiId) {
            const upiIdField = document.getElementById('upi-id');
            const qrResult = document.getElementById('qr-result');
            
            if (upiIdField) upiIdField.value = upiId;
            if (qrResult) qrResult.style.display = 'block';
            
            this.showNotification('UPI ID extracted successfully!', 'success');
            this.stopQRScanner();
        } else {
            this.showNotification('No valid UPI ID found in QR code', 'error');
        }
    }

    extractUPIId(qrCodeMessage) {
        // Common UPI QR code patterns
        const patterns = [
            /upi:\/\/pay\?.*pa=([^&]+)/i,  // Standard UPI format
            /pa=([^&\s]+)/i,              // Parameter format
            /([a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+)/i  // Direct UPI ID format
        ];
        
        for (const pattern of patterns) {
            const match = qrCodeMessage.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    // Expense Management
    handleExpenseSubmit() {
        const formData = this.getFormData();
        
        if (this.validateExpenseData(formData)) {
            const expense = {
                id: this.generateId(),
                ...formData,
                status: 'pending',
                timestamp: Date.now()
            };
            
            this.addExpense(expense);
            this.resetForm('expense-form');
            this.showNotification('Expense added successfully!', 'success');
            
            // Show payment modal
            this.showPaymentModal(expense);
        }
    }

    getFormData() {
        const data = {};
        
        // Get values from form fields
        const upiIdField = document.getElementById('upi-id');
        const amountField = document.getElementById('amount');
        const categoryField = document.getElementById('category');
        const purposeField = document.getElementById('purpose');
        const dateField = document.getElementById('expense-date');
        const notesField = document.getElementById('notes');
        
        if (upiIdField) data.upiId = upiIdField.value.trim();
        if (amountField) data.amount = parseFloat(amountField.value) || 0;
        if (categoryField) data.purpose = categoryField.value;
        if (purposeField) data.customPurpose = purposeField.value.trim();
        if (dateField) data.date = dateField.value;
        if (notesField) data.notes = notesField.value.trim();
        
        return data;
    }

    getEditFormData() {
        const data = {};
        
        // Get values from edit form fields
        const upiIdField = document.getElementById('edit-upi-id');
        const amountField = document.getElementById('edit-amount');
        const categoryField = document.getElementById('edit-category');
        const purposeField = document.getElementById('edit-purpose');
        const dateField = document.getElementById('edit-expense-date');
        const notesField = document.getElementById('edit-notes');
        const statusField = document.getElementById('edit-status');
        
        if (upiIdField) data.upiId = upiIdField.value.trim();
        if (amountField) data.amount = parseFloat(amountField.value) || 0;
        if (categoryField) data.purpose = categoryField.value;
        if (purposeField) data.customPurpose = purposeField.value.trim();
        if (dateField) data.date = dateField.value;
        if (notesField) data.notes = notesField.value.trim();
        if (statusField) data.status = statusField.value;
        
        return data;
    }

    validateExpenseData(data) {
        const required = ['upiId', 'amount', 'purpose', 'customPurpose', 'date'];
        
        for (const field of required) {
            if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
                this.showNotification(`Please fill in the ${this.getFieldDisplayName(field)} field`, 'error');
                return false;
            }
        }
        
        if (data.amount <= 0) {
            this.showNotification('Amount must be greater than 0', 'error');
            return false;
        }
        
        if (!this.isValidUPIId(data.upiId)) {
            this.showNotification('Please enter a valid UPI ID (format: name@bank)', 'error');
            return false;
        }
        
        return true;
    }

    getFieldDisplayName(field) {
        const mapping = {
            upiId: 'UPI ID',
            amount: 'Amount',
            purpose: 'Category',
            customPurpose: 'Purpose',
            date: 'Date'
        };
        return mapping[field] || field;
    }

    isValidUPIId(upiId) {
        const upiPattern = /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/;
        return upiPattern.test(upiId);
    }

    addExpense(expense, save = true) {
        this.expenses.unshift(expense);
        
        if (save) {
            this.saveExpenses();
            this.updateDashboard();
            this.updateAnalytics();
        }
    }

    editExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;
        
        // Populate edit form
        const fields = {
            'edit-expense-id': expense.id,
            'edit-upi-id': expense.upiId,
            'edit-amount': expense.amount,
            'edit-category': expense.purpose,
            'edit-purpose': expense.customPurpose,
            'edit-expense-date': expense.date,
            'edit-notes': expense.notes || '',
            'edit-status': expense.status
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('edit-modal'));
        modal.show();
    }

    updateExpense() {
        const expenseIdField = document.getElementById('edit-expense-id');
        if (!expenseIdField) return;
        
        const expenseId = expenseIdField.value;
        const formData = this.getEditFormData();
        
        if (this.validateExpenseData(formData)) {
            const expenseIndex = this.expenses.findIndex(e => e.id === expenseId);
            if (expenseIndex !== -1) {
                this.expenses[expenseIndex] = {
                    ...this.expenses[expenseIndex],
                    ...formData,
                    timestamp: this.expenses[expenseIndex].timestamp
                };
                
                this.saveExpenses();
                this.updateDashboard();
                this.updateAnalytics();
                this.showNotification('Expense updated successfully!', 'success');
                
                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('edit-modal'));
                if (modal) modal.hide();
            }
        }
    }

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            this.expenses = this.expenses.filter(e => e.id !== id);
            this.saveExpenses();
            this.updateDashboard();
            this.updateAnalytics();
            this.showNotification('Expense deleted successfully!', 'success');
        }
    }

    // Payment Functions
    showPaymentModal(expense) {
        const paymentUpi = document.getElementById('payment-upi');
        const paymentAmount = document.getElementById('payment-amount');
        const paymentPurpose = document.getElementById('payment-purpose');
        
        if (paymentUpi) paymentUpi.textContent = expense.upiId;
        if (paymentAmount) paymentAmount.textContent = expense.amount;
        if (paymentPurpose) paymentPurpose.textContent = expense.customPurpose;
        
        // Store current expense for payment
        window.currentPaymentExpense = expense;
        
        const modal = new bootstrap.Modal(document.getElementById('payment-modal'));
        modal.show();
    }

    selectPaymentApp(app) {
        // Highlight selected app
        document.querySelectorAll('.payment-app-btn').forEach(btn => {
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--outline');
        });
        
        const selectedBtn = document.querySelector(`[data-app="${app}"]`);
        if (selectedBtn) {
            selectedBtn.classList.remove('btn--outline');
            selectedBtn.classList.add('btn--primary');
        }
        
        window.selectedPaymentApp = app;
    }

    generateUPIUrl(expense) {
        const { upiId, amount, customPurpose } = expense;
        const encodedPurpose = encodeURIComponent(customPurpose);
        return `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=${encodedPurpose}`;
    }

    initiatePayment() {
        const expense = window.currentPaymentExpense;
        if (!expense) return;
        
        const upiUrl = this.generateUPIUrl(expense);
        
        // Store payment URL in expense
        const expenseIndex = this.expenses.findIndex(e => e.id === expense.id);
        if (expenseIndex !== -1) {
            this.expenses[expenseIndex].paymentUrl = upiUrl;
            this.saveExpenses();
        }
        
        // Attempt to open UPI app
        const link = document.createElement('a');
        link.href = upiUrl;
        link.target = '_blank';
        link.click();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('payment-modal'));
        if (modal) modal.hide();
        
        this.showNotification('Payment initiated! Complete the payment in your UPI app.', 'info');
        
        // Prompt to mark as paid after a delay
        setTimeout(() => {
            if (confirm('Have you completed the payment? Click OK to mark as paid.')) {
                this.markAsPaid(expense.id);
            }
        }, 3000);
    }

    markAsPaid(id) {
        const expenseIndex = this.expenses.findIndex(e => e.id === id);
        if (expenseIndex !== -1) {
            this.expenses[expenseIndex].status = 'paid';
            this.saveExpenses();
            this.updateDashboard();
            this.updateAnalytics();
            this.showNotification('Expense marked as paid!', 'success');
        }
    }

    // Dashboard Functions
    updateDashboard() {
        this.updateSummaryCards();
        this.renderExpensesList();
    }

    updateSummaryCards() {
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const paidCount = this.expenses.filter(e => e.status === 'paid').length;
        const pendingCount = this.expenses.filter(e => e.status === 'pending').length;
        const totalCount = this.expenses.length;
        
        const elements = {
            'total-expenses': `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'paid-count': paidCount,
            'pending-count': pendingCount,
            'total-count': totalCount
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    renderExpensesList(filteredExpenses = null) {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;
        
        const expenses = filteredExpenses || this.expenses;
        
        if (expenses.length === 0) {
            expensesList.innerHTML = `
                <div class="empty-state">
                    <i data-feather="inbox"></i>
                    <h5>No expenses found</h5>
                    <p>Add your first expense to get started</p>
                </div>
            `;
            feather.replace();
            return;
        }
        
        expensesList.innerHTML = expenses.map(expense => `
            <div class="expense-item">
                <div class="expense-avatar">
                    ${expense.purpose.charAt(0).toUpperCase()}
                </div>
                <div class="expense-details">
                    <h6 class="expense-title">${expense.customPurpose}</h6>
                    <p class="expense-subtitle">
                        ${expense.upiId} • ${this.formatDate(expense.date)} • 
                        <span class="status status--${expense.status}">${expense.status.toUpperCase()}</span>
                    </p>
                </div>
                <div class="expense-amount">₹${expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div class="expense-actions">
                    ${expense.status === 'pending' ? `
                        <button class="btn btn--sm btn--primary" onclick="app.showPaymentModal(${JSON.stringify(expense).replace(/"/g, '&quot;')})">
                            <i data-feather="credit-card"></i>
                            Pay
                        </button>
                    ` : ''}
                    <button class="btn btn--sm btn--outline" onclick="app.editExpense('${expense.id}')">
                        <i data-feather="edit-2"></i>
                        Edit
                    </button>
                    <button class="btn btn--sm btn--outline" onclick="app.deleteExpense('${expense.id}')">
                        <i data-feather="trash-2"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        feather.replace();
    }

    filterExpenses(query) {
        if (!query.trim()) {
            this.renderExpensesList();
            return;
        }
        
        const filtered = this.expenses.filter(expense =>
            expense.customPurpose.toLowerCase().includes(query.toLowerCase()) ||
            expense.upiId.toLowerCase().includes(query.toLowerCase()) ||
            expense.purpose.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderExpensesList(filtered);
    }

    // Analytics Functions
    updateAnalytics() {
        this.renderCategoryChart();
        this.renderTrendChart();
        this.renderCategoryBreakdown();
    }

    renderCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (window.categoryChart) {
            window.categoryChart.destroy();
        }
        
        const categoryData = this.getCategoryData();
        
        if (categoryData.labels.length === 0) {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            return;
        }
        
        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325'],
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f5f5f5',
                            padding: 20
                        }
                    }
                }
            }
        });
    }

    renderTrendChart() {
        const ctx = document.getElementById('trend-chart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (window.trendChart) {
            window.trendChart.destroy();
        }
        
        const trendData = this.getTrendData();
        
        window.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Daily Expenses',
                    data: trendData.values,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#f5f5f5'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#f5f5f5'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#f5f5f5',
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    renderCategoryBreakdown() {
        const breakdown = document.getElementById('category-breakdown');
        if (!breakdown) return;
        
        const categoryData = this.getCategoryData();
        const total = categoryData.values.reduce((sum, val) => sum + val, 0);
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325'];
        
        if (categoryData.labels.length === 0) {
            breakdown.innerHTML = '<div class="empty-state"><p>No expense data available</p></div>';
            return;
        }
        
        breakdown.innerHTML = categoryData.labels.map((label, index) => {
            const amount = categoryData.values[index];
            const percentage = total > 0 ? (amount / total * 100).toFixed(1) : 0;
            
            return `
                <div class="breakdown-item">
                    <div class="breakdown-category">
                        <div class="breakdown-color" style="background-color: ${colors[index]}"></div>
                        <span class="breakdown-name">${label}</span>
                    </div>
                    <div>
                        <span class="breakdown-amount">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span class="breakdown-percentage">(${percentage}%)</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCategoryData() {
        const categoryMap = {};
        
        this.expenses.forEach(expense => {
            const category = expense.purpose;
            categoryMap[category] = (categoryMap[category] || 0) + expense.amount;
        });
        
        return {
            labels: Object.keys(categoryMap),
            values: Object.values(categoryMap)
        };
    }

    getTrendData() {
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }
        
        const dailyTotals = last7Days.map(date => {
            return this.expenses
                .filter(expense => expense.date === date)
                .reduce((sum, expense) => sum + expense.amount, 0);
        });
        
        return {
            labels: last7Days.map(date => new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })),
            values: dailyTotals
        };
    }

    // Utility Functions
    generateId() {
        return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            this.setCurrentDate();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `status status--${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(20px);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Local Storage Functions
    loadExpenses() {
        try {
            const stored = localStorage.getItem('cosmic-upi-expenses');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading expenses:', error);
            return [];
        }
    }

    saveExpenses() {
        try {
            localStorage.setItem('cosmic-upi-expenses', JSON.stringify(this.expenses));
        } catch (error) {
            console.error('Error saving expenses:', error);
            this.showNotification('Error saving data', 'error');
        }
    }
}

// Global functions for event handlers
window.showSection = function(sectionName) {
    if (window.app) {
        window.app.showSection(sectionName);
    }
};

window.updateExpense = function() {
    if (window.app) {
        window.app.updateExpense();
    }
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CosmicUPITracker();
    
    // Set initial active section
    window.app.showSection('dashboard');
    
    // Add some cosmic effects
    const main = document.querySelector('.cosmic-main');
    if (main) {
        main.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            
            const xPercent = clientX / innerWidth;
            const yPercent = clientY / innerHeight;
            
            main.style.background = `
                radial-gradient(circle at ${xPercent * 100}% ${yPercent * 100}%, 
                rgba(31, 184, 205, 0.1) 0%, 
                transparent 50%), 
                linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 25%, #16213e 75%, #0a0a0f 100%)
            `;
        });
    }
});