// Cosmic UPI Tracker - Client-Side Application JavaScript

class CosmicUPITracker {
    constructor() {
        this.expenses = [];
        this.qrCodeReader = null;
        this.isScanning = false;
        this.editModal = null;
        this.paymentModal = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
        this.paymentModal = new bootstrap.Modal(document.getElementById('payment-modal'));
        await this.loadExpenses();
        this.setCurrentDate();
    }
    
    // --- Data Fetching ---
    async loadExpenses() {
        try {
            const res = await fetch('/api/transactions');
            if (!res.ok) throw new Error('Failed to fetch expenses');
            this.expenses = await res.json();
            this.updateDashboard();
            this.updateAnalytics();
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.showNotification('Could not load expenses from the server.', 'error');
        }
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
        document.getElementById('toggle-scanner').addEventListener('click', () => this.toggleQRScanner());

        // Expense form
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExpenseSubmit();
        });

        // Save Edit form
        document.getElementById('save-edit-btn').addEventListener('click', () => this.handleUpdateExpense());

        // Search
        document.getElementById('search-expenses').addEventListener('input', (e) => this.filterExpenses(e.target.value));

        // Payment app buttons
        document.querySelectorAll('.payment-app-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectPaymentApp(btn.dataset.app));
        });

        // Generic pay button
        document.getElementById('generic-pay-btn').addEventListener('click', () => this.initiatePayment());
    }

    showSection(sectionName) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

        if (sectionName === 'analytics') {
            setTimeout(() => this.updateAnalytics(), 100);
        }
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;
    }

    // --- QR Code Scanner ---
    toggleQRScanner() {
        const toggleBtn = document.getElementById('toggle-scanner');
        const readerContainer = document.getElementById('qr-reader-container');
        
        if (!this.isScanning) {
            this.qrCodeReader = new Html5Qrcode("qr-reader");
            toggleBtn.innerHTML = '<i data-feather="camera-off"></i> Stop Scanner';
            readerContainer.style.display = 'block';
            
            this.qrCodeReader.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 }},
                (decodedText) => this.onQRCodeScanned(decodedText),
                (errorMessage) => { /* ignore errors */ }
            ).then(() => {
                this.isScanning = true;
                feather.replace();
            }).catch(err => {
                console.error('QR Scanner Error:', err);
                this.showNotification('Failed to start camera.', 'error');
                this.stopQRScanner();
            });
        } else {
            this.stopQRScanner();
        }
    }

    stopQRScanner() {
        if (this.qrCodeReader && this.isScanning) {
            this.qrCodeReader.stop().then(() => {
                const toggleBtn = document.getElementById('toggle-scanner');
                const readerContainer = document.getElementById('qr-reader-container');
                toggleBtn.innerHTML = '<i data-feather="camera"></i> Start Scanner';
                readerContainer.style.display = 'none';
                this.isScanning = false;
                feather.replace();
            });
        }
    }

    onQRCodeScanned(qrCodeMessage) {
        const upiId = this.extractUPIId(qrCodeMessage);
        if (upiId) {
            document.getElementById('upi-id').value = upiId;
            document.getElementById('qr-result').style.display = 'block';
            this.showNotification('UPI ID extracted successfully!', 'success');
            this.stopQRScanner();
        } else {
            this.showNotification('No valid UPI ID found.', 'error');
        }
    }

    extractUPIId(qrCodeMessage) {
        const patterns = [/upi:\/\/pay\?.*pa=([^&]+)/i, /pa=([^&\s]+)/i, /([a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+)/i];
        for (const pattern of patterns) {
            const match = qrCodeMessage.match(pattern);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    // --- Expense Management ---
    async handleExpenseSubmit() {
        const formData = this.getFormData('add');
        if (!this.validateExpenseData(formData)) return;

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Server error');
            const newExpense = await res.json();
            
            this.expenses.unshift(newExpense);
            this.updateDashboard();
            this.updateAnalytics();
            this.resetForm('expense-form');
            this.showNotification('Expense added!', 'success');
            this.showPaymentModal(newExpense);
        } catch (error) {
            this.showNotification('Failed to add expense.', 'error');
        }
    }
    
    getFormData(type) {
        const prefix = type === 'edit' ? 'edit-' : '';
        return {
            upiId: document.getElementById(`${prefix}upi-id`).value.trim(),
            amount: parseFloat(document.getElementById(`${prefix}amount`).value) || 0,
            category: document.getElementById(`${prefix}category`).value,
            purpose: document.getElementById(`${prefix}purpose`).value.trim(),
            date: document.getElementById(`${prefix}expense-date`).value,
            notes: document.getElementById(`${prefix}notes`).value.trim(),
            ...(type === 'edit' && { status: document.getElementById('edit-status').value })
        };
    }

    validateExpenseData(data) {
        if (!data.upiId || data.amount <= 0 || !data.category || !data.purpose || !data.date) {
            this.showNotification('Please fill all required fields correctly.', 'error');
            return false;
        }
        if (!/^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/.test(data.upiId)) {
            this.showNotification('Invalid UPI ID format.', 'error');
            return false;
        }
        return true;
    }

    editExpense(id) {
        const expense = this.expenses.find(e => e._id === id);
        if (!expense) return;

        document.getElementById('edit-expense-id').value = expense._id;
        document.getElementById('edit-upi-id').value = expense.upiId;
        document.getElementById('edit-amount').value = expense.amount;
        document.getElementById('edit-category').value = expense.category;
        document.getElementById('edit-purpose').value = expense.purpose;
        document.getElementById('edit-expense-date').value = new Date(expense.date).toISOString().split('T')[0];
        document.getElementById('edit-notes').value = expense.notes || '';
        document.getElementById('edit-status').value = expense.status;

        this.editModal.show();
    }

    async handleUpdateExpense() {
        const id = document.getElementById('edit-expense-id').value;
        const formData = this.getFormData('edit');
        if (!this.validateExpenseData(formData)) return;

        try {
            const res = await fetch(`/api/transactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Server error');
            const updatedExpense = await res.json();

            const index = this.expenses.findIndex(e => e._id === id);
            if (index > -1) this.expenses[index] = updatedExpense;
            
            this.updateDashboard();
            this.updateAnalytics();
            this.editModal.hide();
            this.showNotification('Expense updated!', 'success');
        } catch (error) {
            this.showNotification('Failed to update expense.', 'error');
        }
    }

    async deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Server error');
            
            this.expenses = this.expenses.filter(e => e._id !== id);
            this.updateDashboard();
            this.updateAnalytics();
            this.showNotification('Expense deleted.', 'success');
        } catch (error) {
            this.showNotification('Failed to delete expense.', 'error');
        }
    }

    // --- Payment ---
    showPaymentModal(expense) {
        document.getElementById('payment-upi').textContent = expense.upiId;
        document.getElementById('payment-amount').textContent = expense.amount.toFixed(2);
        document.getElementById('payment-purpose').textContent = expense.purpose;
        
        window.currentPaymentExpense = expense;
        this.paymentModal.show();
    }
    
    selectPaymentApp(app) {
        document.querySelectorAll('.payment-app-btn').forEach(btn => btn.classList.remove('btn--primary', 'btn-primary'));
        document.querySelector(`[data-app="${app}"]`).classList.add('btn--primary', 'btn-primary');
        window.selectedPaymentApp = app;
    }

    initiatePayment() {
        const expense = window.currentPaymentExpense;
        if (!expense) return;
        
        const upiUrl = `upi://pay?pa=${expense.upiId}&am=${expense.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(expense.purpose)}`;
        window.open(upiUrl, '_blank');
        
        this.paymentModal.hide();
        this.showNotification('Payment initiated!', 'info');

        setTimeout(() => {
            if (confirm('Did you complete the payment? Mark as paid?')) {
                this.markAsPaid(expense._id);
            }
        }, 3000);
    }

    async markAsPaid(id) {
        const expense = this.expenses.find(e => e._id === id);
        if (expense) {
             const res = await fetch(`/api/transactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...expense, status: 'paid' })
            });
            if(res.ok){
                expense.status = 'paid';
                this.updateDashboard();
                this.updateAnalytics();
                this.showNotification('Expense marked as paid.', 'success');
            } else {
                this.showNotification('Failed to update status.', 'error');
            }
        }
    }

    // --- Dashboard & Analytics ---
    updateDashboard() {
        this.updateSummaryCards();
        this.renderExpensesList();
    }
    
    updateSummaryCards() {
        const total = this.expenses.reduce((sum, e) => sum + e.amount, 0);
        const paid = this.expenses.filter(e => e.status === 'paid').length;
        const pending = this.expenses.filter(e => e.status === 'pending').length;

        document.getElementById('total-expenses').textContent = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById('paid-count').textContent = paid;
        document.getElementById('pending-count').textContent = pending;
        document.getElementById('total-count').textContent = this.expenses.length;
    }

    renderExpensesList(filtered = null) {
        const listEl = document.getElementById('expenses-list');
        const expensesToRender = filtered || this.expenses;
        
        if (expensesToRender.length === 0) {
            listEl.innerHTML = `<div class="empty-state p-3"><i data-feather="inbox"></i><h5>No expenses found</h5><p>Add your first expense to get started</p></div>`;
            feather.replace();
            return;
        }

        listEl.innerHTML = expensesToRender.map(expense => `
            <div class="expense-item">
                <div class="expense-avatar" style="background-color: ${this.getCategoryColor(expense.category, true)}">${expense.category.charAt(0)}</div>
                <div class="expense-details">
                    <h6 class="expense-title">${expense.purpose}</h6>
                    <p class="expense-subtitle">
                        ${expense.upiId} &bull; ${this.formatDate(expense.date)} &bull; 
                        <span class="status status--${expense.status}">${expense.status.toUpperCase()}</span>
                    </p>
                </div>
                <div class="expense-amount">₹${expense.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                <div class="expense-actions">
                    ${expense.status === 'pending' ? `<button class="btn btn--sm btn--primary" onclick="app.showPaymentModal(JSON.parse('${JSON.stringify(expense).replace(/'/g, "\\'")}'))"><i data-feather="credit-card"></i> Pay</button>` : ''}
                    <button class="btn btn--sm btn--outline" onclick="app.editExpense('${expense._id}')"><i data-feather="edit-2"></i></button>
                    <button class="btn btn--sm btn--outline text-danger" onclick="app.deleteExpense('${expense._id}')"><i data-feather="trash-2"></i></button>
                </div>
            </div>
        `).join('');
        feather.replace();
    }

    filterExpenses(query) {
        const q = query.toLowerCase();
        if (!q) {
            this.renderExpensesList();
            return;
        }
        const filtered = this.expenses.filter(e => 
            e.purpose.toLowerCase().includes(q) ||
            e.upiId.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q)
        );
        this.renderExpensesList(filtered);
    }

    updateAnalytics() {
        this.renderCategoryChart();
        this.renderTrendChart();
        this.renderCategoryBreakdown();
    }
    
    getCategoryData() {
        const categoryMap = this.expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});
        return {
            labels: Object.keys(categoryMap),
            values: Object.values(categoryMap)
        };
    }

    renderCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (window.categoryChart) window.categoryChart.destroy();
        const { labels, values } = this.getCategoryData();
        if (labels.length === 0) return;

        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: labels.map(l => this.getCategoryColor(l)), borderColor: '#262828', borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#bbb' } } } }
        });
    }

    renderTrendChart() {
        const ctx = document.getElementById('trend-chart');
        if (window.trendChart) window.trendChart.destroy();
        
        const trendData = this.expenses.reduce((acc, e) => {
            const date = new Date(e.date).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + e.amount;
            return acc;
        }, {});
        
        const sortedDates = Object.keys(trendData).sort();
        const labels = sortedDates.map(d => this.formatDate(d, {day: 'numeric', month: 'short'}));
        const values = sortedDates.map(d => trendData[d]);

        window.trendChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Daily Expenses', data: values, borderColor: '#1FB8CD', backgroundColor: 'rgba(31, 184, 205, 0.1)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#bbb' } }, y: { ticks: { color: '#bbb' } } } }
        });
    }

    renderCategoryBreakdown() {
        const breakdownEl = document.getElementById('category-breakdown');
        const { labels, values } = this.getCategoryData();
        const total = values.reduce((sum, v) => sum + v, 0);
        if (labels.length === 0) {
            breakdownEl.innerHTML = `<div class="empty-state p-3"><p>No data available</p></div>`;
            return;
        }

        breakdownEl.innerHTML = labels.map((label, i) => `
            <div class="breakdown-item">
                <div class="breakdown-category">
                    <div class="breakdown-color" style="background-color: ${this.getCategoryColor(label)}"></div>
                    <span class="breakdown-name">${label}</span>
                </div>
                <div>
                    <span class="breakdown-amount">₹${values[i].toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    <span class="breakdown-percentage">(${(total > 0 ? (values[i] / total * 100) : 0).toFixed(1)}%)</span>
                </div>
            </div>
        `).join('');
    }

    // --- Utilities ---
    formatDate(dateString, options = {}) {
        const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    }

    resetForm(formId) {
        document.getElementById(formId).reset();
        this.setCurrentDate();
    }
    
    getCategoryColor(category, isBg = false) {
        const colors = {
            'Food': '#f59e0b', 'Transport': '#3b82f6', 'Shopping': '#ec4899',
            'Bills': '#ef4444', 'Entertainment': '#8b5cf6', 'Healthcare': '#10b981',
            'Education': '#6366f1', 'Others': '#78716c'
        };
        const color = colors[category] || colors['Others'];
        return isBg ? `linear-gradient(135deg, ${color}99, ${color}FF)` : color;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `status status--${type}`;
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 1056; transform: translateX(120%); transition: transform 0.3s ease;`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.style.transform = 'translateX(0)', 10);
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            notification.addEventListener('transitionend', () => notification.remove());
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new CosmicUPITracker();
});
