// API Base URL
const API_BASE_URL = '/api'; 
// State management
let isFilterCollapsed = true;
let currentUser = null;
let accounts = [];
let services = [];
let userServices = [];
let allUsers = [];
let allInvoices = []; // Store all invoices for filtering
let availableServicesForFilter = []; // Store services for filter dropdown
let currentInvoiceView = 'serviceColumns'; // 'standard' or 'serviceColumns'
let allUniqueServices = []; // Store all unique services for dynamic columns
let currentDateRange = {from: null,to: null}; 
// Pagination state for Service Columns View
let serviceColumnsCurrentPage = 1;
let serviceColumnsPageSize = 100;
let serviceColumnsFilteredData = []; // Store filtered data for pagination


let isPrinting = false;
let isPrintModalOpen = false;
let isRenderingPrint = false;



// Get elements
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebar = document.getElementById('sidebar');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateCopyrightYear();
    setupEventListeners();
    checkAuth();
    setupSidebarToggle();
});

// Add this function to update copyright year
function updateCopyrightYear() {
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}   


function setupEventListeners() {

   
 

    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('logoutBtnSidebar')?.addEventListener('click', handleLogout);
    document.getElementById('invoiceForm')?.addEventListener('submit', handleSubmitInvoice);
    document.getElementById('showCreateInvoiceBtn')?.addEventListener('click', () =>showModal('invoiceModal'));
    document.getElementById('cancelInvoiceBtn')?.addEventListener('click', () => closeModal('invoiceModal'));
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // document.querySelectorAll('.nav-item').forEach(item => {
    //     item.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         const section = item.dataset.section;
    //         switchSection(section);
    //         document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    //         item.classList.add('active');
    //     });
    // });    


    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // If switching to invoices section, ensure filter is collapsed
            if (section === 'invoices' && !isFilterCollapsed) {
                toggleFilterCollapse();
            }
        });
    });


     // Add filter collapse toggle listener
    const filterHeaderToggle = document.getElementById('filterHeaderToggle');
    if (filterHeaderToggle) {
        filterHeaderToggle.addEventListener('click', toggleFilterCollapse);
    }


      const editInvoiceForm = document.getElementById('editInvoiceForm');
    if (editInvoiceForm) {
        editInvoiceForm.addEventListener('submit', handleEditInvoice);
    }
    
    const cancelEditBtn = document.getElementById('cancelEditInvoiceBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => closeModal('editInvoiceModal'));
    }
    
    const accountForm = document.getElementById('accountForm');
    if (accountForm) accountForm.addEventListener('submit', handleAddAccount);
    
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) serviceForm.addEventListener('submit', handleAddService);
    
    const userForm = document.getElementById('userForm');
    if (userForm) userForm.addEventListener('submit', handleAddUser);   

    setupFilterEventListeners(); 
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed'); 
                if (sidebar.classList.contains('collapsed')) {  
                    document.querySelectorAll('.logo').forEach(el => {                         
                         el.style.display = 'none';  
                        
                        });  
                    document.querySelectorAll('.copyright').forEach(el => { 
                         el.style.display = 'none' ; 
                    
                    }); 
                } else { 


                    document.querySelectorAll('.logo').forEach(el => el.style.display = 'flex'); 
                    document.querySelectorAll('.copyright').forEach(el => el.style.display = 'block');
                 }

        });
    }
}
function switchSection(section) {
    const sectionMap = {
        'dashboard': 'dashboardSection',
        'invoices': 'invoicesSection',
        'accounts': 'accountsSection',
        'services': 'servicesSection',
        'user-services': 'userServicesSection',
        'users': 'usersSection',
        'activity': 'activitySection'
    };
    
    const sectionId = sectionMap[section];
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active'); 

    // console.log('Active section' , targetSection)
    
    const sectionTitles = {
        dashboard: 'Dashboard',
        invoices: 'Records Management',
        accounts: 'Account Management',
        services: 'Service Management',
        'user-services': 'User Service Assignments',
        users: 'User Management',
        activity: 'Activity Log'
    };
    
    const headerTitle = document.getElementById('currentSectionTitle');
    if (headerTitle) headerTitle.textContent = sectionTitles[section] || 'Dashboard';
    
    if (section === 'accounts') loadAccounts();
    if (section === 'services') loadServicesList();
    if (section === 'user-services') {
        loadUsersForServiceAssignment();
        loadAllServicesForAssignment();
        const userServiceManagement = document.getElementById('userServiceManagement');
        if (userServiceManagement) userServiceManagement.style.display = 'none';
    }
    if (section === 'users'){
        loadUsers() ;
        addUserServiceSelect();
    
    };
    if (section === 'activity'){ 
       loadActivityLog() 
    };
    if (section === 'dashboard') {
        loadSummary();
        loadRecentActivity();
    }
    if (section === 'invoices')  {
        loadInvoices(); 
        toggleFilterCollapse(); // Ensure filter is collapsed when navigating to invoices


    } ;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId); 

    // alert(`show modal with id ${modalId}` )
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Update filtered count display
function updateFilteredCount(count) {
    const filteredCountSpan = document.getElementById('filteredCount');
    if (filteredCountSpan) {
        filteredCountSpan.textContent = count;
    }
}

// update records count 
function updateRecordCount(count) {
    const badge = document.getElementById('recordCount');
    if (badge) badge.textContent = `${count} records`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function handleLogout() {
    logActivity('User logged out');
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function checkAuth() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showDashboard();   
      
    }
}  

// Message Modal functions
function showMessageModal(message, type = 'info', title = '') {
    const modal = document.getElementById('messageModal');
    const icon = document.getElementById('messageIcon');
    const titleElement = document.getElementById('messageTitle');
    const textElement = document.getElementById('messageText');
    
    // Set icon based on type
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titleMap = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
    };
    
    icon.className = `fas ${iconMap[type] || iconMap.info}`;
    titleElement.textContent = title || titleMap[type] || 'Message';
    textElement.textContent = message;
    
    // Remove existing type classes
    modal.classList.remove('success', 'error', 'warning', 'info');
    modal.classList.add(type);
    
    modal.classList.add('active');
    
    // Close modal when clicking the close button
    const closeBtn = modal.querySelector('.message-close-btn');
    const confirmBtn = document.getElementById('messageConfirmBtn');
    
    const closeHandler = () => {
        modal.classList.remove('active');
        closeBtn.removeEventListener('click', closeHandler);
        confirmBtn.removeEventListener('click', closeHandler);
        modal.removeEventListener('click', backdropHandler);
    };
    
    const backdropHandler = (e) => {
        if (e.target === modal) {
            closeHandler();
        }
    };
    
    closeBtn.addEventListener('click', closeHandler);
    confirmBtn.addEventListener('click', closeHandler);
    modal.addEventListener('click', backdropHandler);
}

// Confirm modal function for delete operations
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('messageModal');
    const icon = document.getElementById('messageIcon');
    const titleElement = document.getElementById('messageTitle');
    const textElement = document.getElementById('messageText');
    const footer = document.querySelector('.message-modal-footer');
    
    // Set warning icon
    icon.className = 'fas fa-exclamation-triangle';
    titleElement.textContent = 'Confirm Action';
    textElement.textContent = message;
    
    modal.classList.remove('success', 'error', 'warning', 'info');
    modal.classList.add('warning');
    
    // Replace footer buttons
    footer.innerHTML = `
        <button id="messageConfirmYes" class="message-btn message-btn-primary" style="background: #ef4444;">Yes, Delete</button>
        <button id="messageConfirmNo" class="message-btn" style="background: var(--gray-light); color: var(--gray-text); margin-left: 12px;">Cancel</button>
    `;
    
    modal.classList.add('active');
    
    const confirmBtn = document.getElementById('messageConfirmYes');
    const cancelBtn = document.getElementById('messageConfirmNo');
    const closeBtn = modal.querySelector('.message-close-btn');
    
    const closeHandler = () => {
        modal.classList.remove('active');
        // Restore original footer
        footer.innerHTML = `
            <button id="messageConfirmBtn" class="message-btn message-btn-primary">OK</button>
        `;
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', closeHandler);
        closeBtn.removeEventListener('click', closeHandler);
        modal.removeEventListener('click', backdropHandler);
    };
    
    const confirmHandler = () => {
        closeHandler();
        if (onConfirm) onConfirm();
    };
    
    const backdropHandler = (e) => {
        if (e.target === modal) {
            closeHandler();
        }
    };
    
    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', closeHandler);
    closeBtn.addEventListener('click', closeHandler);
    modal.addEventListener('click', backdropHandler);
}

// Update handleLogin function
function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === 'admin' && password === 'admin123') {
        currentUser = { username, role: 'admin' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
        logActivity('User logged in as ADMIN');
    } else if (username === 'user' && password === 'user123') {
        currentUser = { username, role: 'user' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
        logActivity('User logged in as REGULAR USER');
    } else {
        showMessageModal('Invalid credentials!', 'error');
    }
}

// Display services in read-only mode
function displayServicesReadOnly(services) {
    const container = document.getElementById('editServicesReadOnly');
    
    if (!container) return;
    
    if (!services || services.length === 0) {
        container.innerHTML = '<div class="empty-state">No services associated with this invoice</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-item-readonly">
            <div>
                <i class="fas fa-stethoscope"></i>
                <span class="service-name-readonly">${escapeHtml(service.service_name)}</span>
            </div>
            <span id="servicePrice" class="service-price-readonly">GH¢${service.price.toFixed(2)}</span>
        </div>
    `).join('');
} 
// Display services in read-only mode

// Helper function to restrict input to numbers only
function onlyNumbers(event) {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow backspace, delete, tab, escape, enter, etc.
    if (charCode === 8 || charCode === 46 || charCode === 9 || charCode === 27 || charCode === 13) {
        return true;
    }
    // Allow only numbers (0-9)
    if (charCode >= 48 && charCode <= 57) {
        return true;
    }
    event.preventDefault();
    return false;
}

// Helper function to restrict input to numbers and decimal point
function onlyNumbersAndDecimal(event) {
    const charCode = event.which ? event.which : event.keyCode;
    const char = String.fromCharCode(charCode);
    
    // Allow backspace, delete, tab, escape, enter, etc.
    if (charCode === 8 || charCode === 46 || charCode === 9 || charCode === 27 || charCode === 13) {
        return true;
    }
    
    // Allow numbers (0-9) and decimal point
    if ((charCode >= 48 && charCode <= 57) || char === '.') {
        // Prevent multiple decimal points
        const input = event.target;
        if (char === '.' && input.value.includes('.')) {
            event.preventDefault();
            return false;
        }
        return true;
    }
    
    event.preventDefault();
    return false;
}

// Validate GCR number to ensure it's exactly 8 digits and only numbers
function validateGCRNumber(input) {
    // Remove any non-numeric characters
    input.value = input.value.replace(/[^\d]/g, '');
    
    // Limit to 8 digits
    if (input.value.length > 8) {
        input.value = input.value.slice(0, 8);
    }
    
    // Optional: Add visual feedback
    if (input.value.length === 8) {
        input.style.borderColor = '#10b981';
    } else if (input.value.length > 0) {
        input.style.borderColor = '#f59e0b';
    } else {
        input.style.borderColor = '';
    }
}

// Validate amount input
function validateAmount(input) {
    // Remove any characters except numbers and decimal point
    let value = input.value;
    value = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const lastDecimalIndex = value.lastIndexOf('.');
        value = value.substring(0, lastDecimalIndex) + value.substring(lastDecimalIndex + 1);
    }
    
    // Limit to 2 decimal places
    if (value.includes('.')) {
        const parts = value.split('.');
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].slice(0, 2);
        }
    }
    
    input.value = value;
    
    // Optional: Visual feedback
    if (value && parseFloat(value) > 0) {
        input.style.borderColor = '#10b981';
    } else if (value) {
        input.style.borderColor = '#f59e0b';
    } else {
        input.style.borderColor = '';
    }
}

// Update buildUniqueServicesList to handle null values
function buildUniqueServicesList() {
    const serviceMap = new Map();
    
    allInvoices.forEach(invoice => {
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                if (!serviceMap.has(serviceName)) {
                    const servicePrice = (service.price !== null && service.price !== undefined) ? service.price : 0;
                    serviceMap.set(serviceName, {
                        name: serviceName,
                        price: servicePrice
                    });
                }
            });
        }
    });
    
    allUniqueServices = Array.from(serviceMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
    );
    
    // console.log('Unique services built:', allUniqueServices);
}

// Render the service columns view with subtotal and grand total rows
function renderServiceColumnsView(invoices, page = 1, pageSize = 100) {
    const thead = document.getElementById('serviceColumnsHeader');
    const tbody = document.getElementById('serviceColumnsBody');
    const footer = document.getElementById('serviceColumnsFooter');
    const recordCountSpan = document.getElementById('serviceColumnsRecordCount');
    const grandTotalSpan = document.getElementById('serviceColumnsGrandTotal');
    
    // Store filtered data for pagination
    serviceColumnsFilteredData = invoices;
    
    // Calculate pagination
    const totalRecords = invoices.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);
    const paginatedInvoices = invoices.slice(startIndex, endIndex);
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No records found</td></tr>';
        if (footer) footer.style.display = 'none';
        if (recordCountSpan) recordCountSpan.textContent = '0 records';
        if (grandTotalSpan) grandTotalSpan.textContent = 'GH¢0.00';
        
        // Update pagination UI
        updatePaginationUI(0, 0, 0, 0);
        return;
    }
    
    // Calculate subtotals for each service from ALL invoices (not just current page)
    const serviceTotals = new Map();
    allUniqueServices.forEach(service => {
        serviceTotals.set(service.name, 0);
    });
    
    // Calculate service subtotals from ALL invoices
    invoices.forEach(invoice => {
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                const servicePrice = (service.price !== null && service.price !== undefined) ? service.price : 0;
                if (serviceTotals.has(serviceName)) {
                    serviceTotals.set(serviceName, serviceTotals.get(serviceName) + servicePrice);
                }
            });
        }
    });
    
    // Build dynamic headers (single row header)
    let headersHtml = `
        <tr>
            <th class="fixed-col-date">Date & Time</th>
            <th class="fixed-col-name">Name</th>
            <th class="fixed-col-gcr">#GCR</th>
            <th class="fixed-col-account" style="width:100px">Account</th>
    `;
    
    // Add service columns
    allUniqueServices.forEach(service => {
        headersHtml += `<th>${escapeHtml(service.name)}</th>`;
    });
    
    headersHtml += `
            <th class="fixed-col-amount">Amount (GH¢)</th>
            <th class="fixed-col-actions">Actions</th>
        </tr>
    `;
    thead.innerHTML = headersHtml;
    
    // Build table body for current page
    let bodyHtml = '';
    let pageTotal = 0;
    
    paginatedInvoices.forEach(invoice => {
        pageTotal += invoice.price || 0;
        
        // Create a map of services for this invoice
        const serviceMap = new Map();
        if (invoice.services && invoice.services.length > 0) { 
            invoice.services.forEach(service => {
                const servicePrice = (service.price !== null && service.price !== undefined) ? service.price : 0;
                serviceMap.set(service.service_name || service.name, {
                    name: service.service_name || service.name,
                    price: servicePrice
                });
            });
        }   
        // console.log('invoice account type:',invoice.account_type)
        bodyHtml += `
            <tr>
                <td class="fixed-col-date">${new Date(invoice.timestamp).toLocaleString()}</td>
                <td class="fixed-col-name"><strong>${escapeHtml(invoice.patient_name)}</strong></td>
                <td class="fixed-col-gcr">${invoice.gcr_number}</td>
                <td class="fixed-col-account">
                    <span class="badge" style="background:${invoice.account_type === 'drugs' ? '#10b981' : '#f59e0b ; width:80px ;'}"${invoice.account_type==='drugs'?">Drug</span>":">non-drug"}</span>
                </td>
        `;
        
        // Add service columns (checkmark or cross)
        allUniqueServices.forEach(service => {   
            const hasService = serviceMap.has(service.name);
            if (hasService) {
                const serviceData = serviceMap.get(service.name);
                const servicePrice = (serviceData.price !== null && serviceData.price !== undefined) ? serviceData.price : 0;
                bodyHtml += `
                    <td class="service-amount-cell" style="text-align: center;">
                        <i class="fas fa-check-circle service-check-mark"></i>
                        <small style="display: block; font-size: 10px;">GH¢${servicePrice.toFixed(2)}</small>
                    </td>
                `;
            } else {
                bodyHtml += `
                    <td style="text-align: center;">
                        <i class="fas fa-times-circle service-cross-mark"></i>
                    </td>
                `;
            }
        });
        
        // Add amount and actions
        const invoiceAmount = (invoice.price !== null && invoice.price !== undefined) ? invoice.price : 0;
        bodyHtml += `
                <td class="fixed-col-amount"><strong>GH¢${invoiceAmount.toFixed(2)}</strong></td>
                <td class="fixed-col-actions">
                    ${currentUser.role === 'admin' ? `
                        <span onclick="editInvoice(${invoice.id})" style="cursor:pointer;margin-right:10px;color:var(--blue-600);">
                            <i class="fas fa-edit"></i>
                        </span>
                        <span onclick="deleteInvoice(${invoice.id})" style="cursor:pointer;color:#ef4444;">
                            <i class="fas fa-trash"></i>
                        </span>
                    ` : '<i class="fas fa-lock" style="color:var(--gray-text);"></i>'}
                </td>
            </tr>
        `;
    });
    
    // Add SUBTOTAL ROW
    bodyHtml += `
        <tr class="subtotal-row" style="background: #eef2ff; font-weight: bold;">
            <td colspan="4" style="text-align: right; font-weight: bold; background: #eef2ff;">
                <strong>SERVICE SUBTOTALS:</strong>
            </td>
    `;
    
    // Add service subtotals
    allUniqueServices.forEach(service => {
        const subtotal = serviceTotals.get(service.name) || 0;
        bodyHtml += `
            <td style="text-align: center; font-weight: bold; color: var(--blue-600); background: #eef2ff;">
                GH¢${subtotal.toFixed(2)}
            </td>
        `;
    });
    
    // Add empty cells for Amount and Actions columns
    bodyHtml += `
            <td style="background: #eef2ff;"></td>
            <td style="background: #eef2ff;"></td>
        </tr>
    `;
    
    // Add GRAND TOTAL ROW
    const grandTotal = invoices.reduce((sum, inv) => sum + (inv.price || 0), 0);
    bodyHtml += `
        <tr class="grand-total-row" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1)); font-weight: bold;">
            <td colspan="4" style="text-align: right; font-weight: bold; font-size: 14px;">
                <strong>GRAND TOTAL:</strong>
            </td>
    `;
    
    // Add empty cells for service columns
    allUniqueServices.forEach(() => {
        bodyHtml += `<td style="background: transparent;"></td>`;
    });
    
    // Add grand total amount
    bodyHtml += `
            <td style="font-weight: bold; font-size: 16px; color: var(--blue-700);">
                <strong>GH¢${grandTotal.toFixed(2)}</strong>
            </td>
            <td style="background: transparent;"></td>
        </tr>
    `;
    
    tbody.innerHTML = bodyHtml;
    
    // Update footer and stats
    if (footer) footer.style.display = 'none';
    if (recordCountSpan) recordCountSpan.textContent = `${totalRecords} records`;
    if (grandTotalSpan) grandTotalSpan.textContent = `GH¢${grandTotal.toFixed(2)}`;
    
    // Update pagination UI
    updatePaginationUI(totalRecords, totalPages, page, pageSize);
    updatePaginationRangeDisplay(startIndex + 1, endIndex, totalRecords);
}

// Helper function to update pagination UI
function updatePaginationUI(totalRecords, totalPages, currentPage, pageSize) {
    const currentPageSpan = document.getElementById('serviceColumnsCurrentPage');
    const totalPagesSpan = document.getElementById('serviceColumnsTotalPages');
    const firstPageBtn = document.getElementById('serviceColumnsFirstPage');
    const prevPageBtn = document.getElementById('serviceColumnsPrevPage');
    const nextPageBtn = document.getElementById('serviceColumnsNextPage');
    const lastPageBtn = document.getElementById('serviceColumnsLastPage');
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages || 1;
    
    // Disable/enable buttons based on current page
    if (firstPageBtn) firstPageBtn.disabled = (currentPage === 1);
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    if (lastPageBtn) lastPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    
    // Style disabled buttons
    [firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn].forEach(btn => {
        if (btn) {
            if (btn.disabled) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        }
    });
}

// Helper function to update range display
function updatePaginationRangeDisplay(start, end, total) {
    const startSpan = document.getElementById('serviceColumnsStartRange');
    const endSpan = document.getElementById('serviceColumnsEndRange');
    const totalSpan = document.getElementById('serviceColumnsTotalRecords');
    
    if (startSpan) startSpan.textContent = start;
    if (endSpan) endSpan.textContent = end;
    if (totalSpan) totalSpan.textContent = total;
}

// Pagination navigation functions
function goToServiceColumnsPage(page) {
    const filteredInvoices = getFilteredInvoicesForServiceColumns();
    const totalPages = Math.ceil(filteredInvoices.length / serviceColumnsPageSize);
    
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;
    
    serviceColumnsCurrentPage = page;
    renderServiceColumnsView(filteredInvoices, serviceColumnsCurrentPage, serviceColumnsPageSize);
}

function nextServiceColumnsPage() {
    const filteredInvoices = getFilteredInvoicesForServiceColumns();
    const totalPages = Math.ceil(filteredInvoices.length / serviceColumnsPageSize);
    if (serviceColumnsCurrentPage < totalPages) {
        serviceColumnsCurrentPage++;
        renderServiceColumnsView(filteredInvoices, serviceColumnsCurrentPage, serviceColumnsPageSize);
    }
}

function prevServiceColumnsPage() {
    if (serviceColumnsCurrentPage > 1) {
        serviceColumnsCurrentPage--;
        const filteredInvoices = getFilteredInvoicesForServiceColumns();
        renderServiceColumnsView(filteredInvoices, serviceColumnsCurrentPage, serviceColumnsPageSize);
    }
}

function firstServiceColumnsPage() {
    serviceColumnsCurrentPage = 1;
    const filteredInvoices = getFilteredInvoicesForServiceColumns();
    renderServiceColumnsView(filteredInvoices, serviceColumnsCurrentPage, serviceColumnsPageSize);
}

function lastServiceColumnsPage() {
    const filteredInvoices = getFilteredInvoicesForServiceColumns();
    const totalPages = Math.ceil(filteredInvoices.length / serviceColumnsPageSize);
    if (totalPages > 0) {
        serviceColumnsCurrentPage = totalPages;
        renderServiceColumnsView(filteredInvoices, serviceColumnsCurrentPage, serviceColumnsPageSize);
    }
}

// Get filtered invoices for service columns (without pagination)
function getFilteredInvoicesForServiceColumns() {
    const accountType = document.getElementById('filterAccountType')?.value || 'all';
    const serviceName = document.getElementById('filterService')?.value || 'all';
    const searchTerm = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const dateFrom = currentDateRange?.from || null;
    const dateTo = currentDateRange?.to || null;
    
    let filtered = [...allInvoices];
    
    // Filter by date range
    if (dateFrom || dateTo) {
        filtered = filtered.filter(inv => {
            const invDate = new Date(inv.timestamp);
            if (dateFrom && dateTo) {
                const fromDate = new Date(dateFrom);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate >= fromDate && invDate <= toDate;
            } else if (dateFrom) {
                const fromDate = new Date(dateFrom);
                return invDate >= fromDate;
            } else if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate <= toDate;
            }
            return true;
        });
    }
    
    // Filter by account type
    if (accountType !== 'all') {
        filtered = filtered.filter(inv => inv.account_name === accountType);
    }
    
    // Filter by service
    if (serviceName !== 'all') {
        filtered = filtered.filter(inv => {
            if (inv.services && inv.services.length > 0) {
                return inv.services.some(s => (s.service_name || s.name) === serviceName);
            }
            return false;
        });
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(inv => 
            inv.patient_name.toLowerCase().includes(searchTerm) ||
            inv.gcr_number.includes(searchTerm)
        );
    }
    
    return filtered;
}


async function loadInvoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) { 
            allInvoices = result.data;
            
            // Ensure each invoice has proper account_type from the account
            // If account_type is null, derive it from account_name
            allInvoices.forEach(inv => {
                if (inv.account_type === null || inv.account_type === undefined) {
                    if (inv.account_name === 'Drugs Account') {
                        inv.account_type = 'drugs';
                    } else if (inv.account_name === 'Non-Drugs Account') {
                        inv.account_type = 'nondrugs';
                    } else {
                        inv.account_type = 'nondrugs'; // default
                    }
                }
                
                // Ensure each service has proper price
                if (inv.services && inv.services.length > 0) {
                    inv.services.forEach(service => {
                        if (service.price === null || service.price === undefined) {
                            service.price = 0;
                        }
                        if (!service.service_name && service.name) {
                            service.service_name = service.name;
                        }
                    });
                }
            });
            
            // Build unique services list
            buildUniqueServicesList();
            
            let totalPrice = 0;
            allInvoices.forEach(i => { 
                totalPrice += (i.price !== null && i.price !== undefined) ? i.price : 0; 
            });
            
        
             
            initializeInvoiceView();


            
            updateRecordCount(allInvoices.length);
            updateFilteredCount(allInvoices.length);
            
            const totalCountSpan = document.getElementById('totalCount');
            if (totalCountSpan) {
                totalCountSpan.textContent = allInvoices.length;
            }
            
            loadServicesForFilter();
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}  

function initializeInvoiceView() {
    const standardViewBtn = document.getElementById('standardViewBtn');
    const serviceColumnsViewBtn = document.getElementById('serviceColumnsViewBtn');
    const standardViewContainer = document.getElementById('standardViewContainer');
    const serviceColumnsViewContainer = document.getElementById('serviceColumnsViewContainer');
    
    if (currentInvoiceView === 'serviceColumns') {
        // Set button states
        if (standardViewBtn) standardViewBtn.classList.remove('active');
        if (serviceColumnsViewBtn) serviceColumnsViewBtn.classList.add('active');
        
        // Show/hide containers
        if (standardViewContainer) standardViewContainer.style.display = 'none';
        if (serviceColumnsViewContainer) serviceColumnsViewContainer.style.display = 'block';
        
        // Render service columns view with all invoices
        renderServiceColumnsView(allInvoices);
    } else {
        // Set button states
        if (standardViewBtn) standardViewBtn.classList.add('active');
        if (serviceColumnsViewBtn) serviceColumnsViewBtn.classList.remove('active');
        
        // Show/hide containers
        if (standardViewContainer) standardViewContainer.style.display = 'block';
        if (serviceColumnsViewContainer) serviceColumnsViewContainer.style.display = 'none';
        
        // Render standard view
        renderInvoicesTable(allInvoices);
    }
}

function updateFilteredGrandTotal(filteredInvoices) {
    const grandTotal = filteredInvoices.reduce((sum, inv) => {
        const amount = (inv.price !== null && inv.price !== undefined) ? inv.price : 0;
        return sum + amount;
    }, 0);
    
    const standardGrandTotal = document.getElementById('filteredGrandTotal');
    if (standardGrandTotal) {
        standardGrandTotal.innerHTML = `<strong>GH¢${grandTotal.toFixed(2)}</strong>`;
    }
    
    const serviceColumnsGrandTotal = document.getElementById('serviceColumnsGrandTotal');
    if (serviceColumnsGrandTotal) {
        serviceColumnsGrandTotal.innerHTML = `<strong>GH¢${grandTotal.toFixed(2)}</strong>`;
    }
}  

function renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    const footer = document.getElementById('tableFooter');
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '|<td colspan="7" class="empty-state">No records found</td>|';
        if (footer) footer.style.display = 'none';
        return;
    }
    
    tbody.innerHTML = invoices.map(inv => {
        const invoiceAmount = (inv.price !== null && inv.price !== undefined) ? inv.price : 0;
        return `
         <tr>
            <td>${new Date(inv.timestamp).toLocaleString()}</td>
            <td><strong>${escapeHtml(inv.patient_name)}</strong></td>
            <td>${inv.gcr_number}</td>
            <td>
                <span class="badge" style="background: ${inv.account_type === 'drugs' ? '#10b981' : '#f59e0b'}">
                    ${escapeHtml(inv.account_name || inv.account_type || 'N/A')}
                </span>
            </td>
            <td>
                <div class="service-badge-list">
                    ${inv.services?.map(s => {
                        const serviceName = s.service_name || s.name;
                        return `<span class="service-badge-small">${escapeHtml(serviceName)}</span>`;
                    }).join('') || '-'}
                </div>
            </td>
            <td><strong>GH¢${invoiceAmount.toFixed(2)}</strong></td>
            <td>
                ${currentUser.role === 'admin' ? `
                    <span onclick="editInvoice(${inv.id})" style="cursor:pointer;margin-right:12px;color:var(--blue-600);display:inline-block;">
                        <i class="fas fa-edit"></i>
                    </span>
                    <span onclick="deleteInvoice(${inv.id})" style="cursor:pointer;color:#ef4444;display:inline-block;">
                        <i class="fas fa-trash"></i>
                    </span>
                ` : '<span style="color:var(--gray-text);"><i class="fas fa-lock"></i> View Only</span>'}
            </td>
         </tr>
    `}).join('');
    
    const grandTotal = invoices.reduce((sum, inv) => {
        const amount = (inv.price !== null && inv.price !== undefined) ? inv.price : 0;
        return sum + amount;
    }, 0);
    
    const grandTotalElement = document.getElementById('filteredGrandTotal');
    if (grandTotalElement) {
        grandTotalElement.innerHTML = `<strong>GH¢${grandTotal.toFixed(2)}</strong>`;
    }
    if (footer) footer.style.display = 'table-footer-group';
} 


function setupFilterEventListeners() {
    const accountTypeFilter = document.getElementById('filterAccountType');
    const serviceFilter = document.getElementById('filterService');
    const searchFilter = document.getElementById('filterSearch');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const applyDateFilterBtn = document.getElementById('applyDateFilterBtn');
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    
    if (accountTypeFilter) {
        accountTypeFilter.addEventListener('change', filterInvoices);
    }
    if (serviceFilter) {
        serviceFilter.addEventListener('change', filterInvoices);
    }
    if (searchFilter) {
        searchFilter.addEventListener('input', filterInvoices);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    if (applyDateFilterBtn) {
        applyDateFilterBtn.addEventListener('click', applyDateRangeFilter);
    }
    if (filterDateFrom) {
        filterDateFrom.addEventListener('change', () => {
            // Auto-apply when date changes
            applyDateRangeFilter();
        });
    }
    if (filterDateTo) {
        filterDateTo.addEventListener('change', () => {
            // Auto-apply when date changes
            applyDateRangeFilter();
        });
    }
}

// Add new function to apply date range filter
function applyDateRangeFilter() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    
    currentDateRange.from = dateFrom;
    currentDateRange.to = dateTo;
    
    filterInvoices();
}

// Update the filterInvoices function to include date range
function filterInvoices() {
    const accountType = document.getElementById('filterAccountType').value;
    const serviceName = document.getElementById('filterService').value;
    const searchTerm = document.getElementById('filterSearch').value.toLowerCase().trim();
    const dateFrom = currentDateRange.from;
    const dateTo = currentDateRange.to;
    
    let filtered = [...allInvoices];
    
    // Filter by date range
    if (dateFrom || dateTo) {
        filtered = filtered.filter(inv => {
            const invDate = new Date(inv.timestamp);
            
            if (dateFrom && dateTo) {
                // Both dates specified
                const fromDate = new Date(dateFrom);
                const toDate = new Date(dateTo);
                // Set to end of day for toDate
                toDate.setHours(23, 59, 59, 999);
                return invDate >= fromDate && invDate <= toDate;
            } else if (dateFrom) {
                // Only from date specified
                const fromDate = new Date(dateFrom);
                return invDate >= fromDate;
            } else if (dateTo) {
                // Only to date specified
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate <= toDate;
            }
            return true;
        });
    }
    
    // Filter by account type
    if (accountType !== 'all') {
        filtered = filtered.filter(inv => inv.account_name === accountType);
    }
    
    // Filter by service
    if (serviceName !== 'all') {
        filtered = filtered.filter(inv => {
            if (inv.services && inv.services.length > 0) {
                return inv.services.some(s => s.service_name === serviceName);
            }
            return false;
        });
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(inv => 
            inv.patient_name.toLowerCase().includes(searchTerm) ||
            inv.gcr_number.includes(searchTerm)
        );
    } 
    
    // Update display based on current view
    if (currentInvoiceView === 'standard') {
        renderInvoicesTable(filtered);
    } 
    if (currentInvoiceView === 'serviceColumns') {
        // Rebuild unique services list for filtered invoices
        buildUniqueServicesListForFiltered(filtered);
        renderServiceColumnsView(filtered);
    }
    
    updateFilteredCount(filtered.length);
    updateFilteredGrandTotal(filtered);
    
    // Update date range display in stats
    updateDateRangeDisplay(filtered.length);
    
    const filteredCountSpan = document.getElementById('filteredCount');
    if (filteredCountSpan) {
        filteredCountSpan.textContent = filtered.length;
    }
}

// New function to build unique services from filtered invoices
function buildUniqueServicesListForFiltered(invoices) {
    const serviceMap = new Map();
    
    invoices.forEach(invoice => {
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                if (!serviceMap.has(serviceName)) {
                    const servicePrice = (service.price !== null && service.price !== undefined) ? service.price : 0;
                    serviceMap.set(serviceName, {
                        name: serviceName,
                        price: servicePrice
                    });
                }
            });
        }
    });
    
    allUniqueServices = Array.from(serviceMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
    );
}

// Update clearFilters function to also clear date range
function clearFilters() {
    document.getElementById('filterAccountType').value = 'all';
    document.getElementById('filterService').value = 'all';
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    
    // Reset date range
    currentDateRange.from = null;
    currentDateRange.to = null;
    
    const filtered = allInvoices;
    
    if (currentInvoiceView === 'standard') {
        renderInvoicesTable(filtered);
    } else {
        buildUniqueServicesList();
        renderServiceColumnsView(filtered);
    }
    
    updateFilteredCount(filtered.length);
    updateFilteredGrandTotal(filtered);
    updateDateRangeDisplay(filtered.length);
    
    const totalCountSpan = document.getElementById('totalCount');
    if (totalCountSpan) {
        totalCountSpan.textContent = filtered.length;
    }
}

// New function to update date range display in stats
function updateDateRangeDisplay(count) {
    const filterStats = document.getElementById('filterStats');
    const dateFrom = currentDateRange.from;
    const dateTo = currentDateRange.to;
    
    if (filterStats && (dateFrom || dateTo)) {
        let dateRangeText = '';
        if (dateFrom && dateTo) {
            dateRangeText = ` | Date Range: ${formatDate(dateFrom)} to ${formatDate(dateTo)}`;
        } else if (dateFrom) {
            dateRangeText = ` | From: ${formatDate(dateFrom)}`;
        } else if (dateTo) {
            dateRangeText = ` | To: ${formatDate(dateTo)}`;
        }
        
        // Update the existing stats text without removing the existing content
        const existingHtml = filterStats.innerHTML;
        if (dateRangeText) {
            // Remove any existing date range text
            const cleanedHtml = existingHtml.replace(/ \| Date Range:.*$/, '');
            filterStats.innerHTML = cleanedHtml + dateRangeText;
        } else {
            // Remove date range if exists
            filterStats.innerHTML = existingHtml.replace(/ \| Date Range:.*$/, '');
        }
    }
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Update the getFilteredInvoices function to include date range
function getFilteredInvoices() {
    const accountType = document.getElementById('filterAccountType').value;
    const serviceName = document.getElementById('filterService').value;
    const searchTerm = document.getElementById('filterSearch').value.toLowerCase().trim();
    const dateFrom = currentDateRange.from;
    const dateTo = currentDateRange.to;
    
    let filtered = [...allInvoices];
    
    // Filter by date range
    if (dateFrom || dateTo) {
        filtered = filtered.filter(inv => {
            const invDate = new Date(inv.timestamp);
            
            if (dateFrom && dateTo) {
                const fromDate = new Date(dateFrom);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate >= fromDate && invDate <= toDate;
            } else if (dateFrom) {
                const fromDate = new Date(dateFrom);
                return invDate >= fromDate;
            } else if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate <= toDate;
            }
            return true;
        });
    }
    
    if (accountType !== 'all') {
        filtered = filtered.filter(inv => inv.account_name === accountType);
    }
    
    if (serviceName !== 'all') {
        filtered = filtered.filter(inv => {
            if (inv.services && inv.services.length > 0) {
                return inv.services.some(s => s.service_name === serviceName);
            }
            return false;
        });
    }
    
    if (searchTerm) {
        filtered = filtered.filter(inv => 
            inv.patient_name.toLowerCase().includes(searchTerm) ||
            inv.gcr_number.includes(searchTerm)
        );
    }
    
    return filtered;
}

// Update the switchInvoiceView function to handle date range when switching views
function switchInvoiceView(view) {
    currentInvoiceView = view;
    
    const standardViewBtn = document.getElementById('standardViewBtn');
    const serviceColumnsViewBtn = document.getElementById('serviceColumnsViewBtn');
    const standardViewContainer = document.getElementById('standardViewContainer');
    const serviceColumnsViewContainer = document.getElementById('serviceColumnsViewContainer');
    
    if (currentInvoiceView === 'standard') {
        standardViewBtn.classList.add('active');
        serviceColumnsViewBtn.classList.remove('active');
        standardViewContainer.style.display = 'block';
        serviceColumnsViewContainer.style.display = 'none';
        
        // Re-render standard view with current filters including date range
        const filtered = getFilteredInvoices();
        renderInvoicesTable(filtered);
        updateFilteredCount(filtered.length);
        updateFilteredGrandTotal(filtered);
    } else {
        standardViewBtn.classList.remove('active');
        serviceColumnsViewBtn.classList.add('active');
        standardViewContainer.style.display = 'none';
        serviceColumnsViewContainer.style.display = 'block';
        
        // Build unique services list from filtered invoices
        const filtered = getFilteredInvoices();
        buildUniqueServicesListForFiltered(filtered);
        
        // Re-render service columns view with current filters including date range
        renderServiceColumnsView(filtered);
        updateFilteredCount(filtered.length);
        updateFilteredGrandTotal(filtered);
    }
} 

// Add this function to handle filter collapse/expand
async function toggleFilterCollapse() {

    // console.log('Toggling filter collapse. Current state:', isFilterCollapsed); 

    const filterContent = document.getElementById('filterContent');
    const toggleIcon = document.getElementById('filterToggleIcon');  
    
    if (!filterContent || !toggleIcon) return;
    
    isFilterCollapsed = !isFilterCollapsed;
    
    if (isFilterCollapsed) {
        filterContent.classList.add('collapsed');
        toggleIcon.classList.add('collapsed');
        // Store preference in localStorage
        localStorage.setItem('filterCollapsed', 'true');
    } else {
        filterContent.classList.remove('collapsed');
        toggleIcon.classList.remove('collapsed');
        // Store preference in localStorage
        localStorage.setItem('filterCollapsed', 'false');
    }
}

// Add this function to load filter collapse state on page load
function loadFilterCollapseState() {
    const savedState = localStorage.getItem('filterCollapsed');
    const filterContent = document.getElementById('filterContent');
    const toggleIcon = document.getElementById('filterToggleIcon');
    
    if (savedState === 'true' && filterContent && toggleIcon) {
        isFilterCollapsed = true;
        filterContent.classList.add('collapsed');
        toggleIcon.classList.add('collapsed');
    } else if (savedState === 'false' && filterContent && toggleIcon) {
        isFilterCollapsed = false;
        filterContent.classList.remove('collapsed');
        toggleIcon.classList.remove('collapsed');
    }
}

// Update the clearFilters function to preserve collapse state
function clearFilters() {
    document.getElementById('filterAccountType').value = 'all';
    document.getElementById('filterService').value = 'all';
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    
    // Reset date range
    currentDateRange.from = null;
    currentDateRange.to = null;
    
    const filtered = allInvoices;
    
    if (currentInvoiceView === 'standard') {
        renderInvoicesTable(filtered);
    } else {
        buildUniqueServicesList();
        renderServiceColumnsView(filtered);
    }
    
    updateFilteredCount(filtered.length);
    updateFilteredGrandTotal(filtered);
    updateDateRangeDisplay(filtered.length);
    
    const totalCountSpan = document.getElementById('totalCount');
    if (totalCountSpan) {
        totalCountSpan.textContent = filtered.length;
    }
    
    //keep collapse state when clearing filters
}


async function showDashboard() {
    updateCopyrightYear();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    
    // document.getElementById('sidebarUserName').textContent = currentUser.username;  
    // document.getElementById('topUserName').textContent = currentUser.username;
    // document.getElementById('sidebarUserRole').textContent = currentUser.role.toUpperCase();
    
    const adminOnlyItems = document.querySelectorAll('.admin-only');
    if (currentUser.role === 'admin') {
        adminOnlyItems.forEach(item => item.style.display = 'flex'); 
        await loadUserAssignedServices();
        await loadInvoices();
        await loadActivityLog();
        await loadSummary();
        await loadAccountsForSelect();
    } else {
        adminOnlyItems.forEach(item => item.style.display = 'none'); 
        await loadUserAssignedServices();
        await loadInvoices();
        await loadActivityLog();
        await loadSummary(); 
        await loadAccountsForSelect();
    }
    
    
    
    switchSection('dashboard');
}

async function loadUserAssignedServices() { 

    // console.log('current user in assigned services:',currentUser)
    try {
        const response = await fetch(`${API_BASE_URL}/my-services`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json(); 

        // console.log('user services report' , result)
        
        if (result.success) {
            userServices = result.data || [];
            updateServicesGridWithUserServices();
            
            const userServicesInfo = document.getElementById('userServicesInfo');
            const userServicesList = document.getElementById('userServicesList');
            
            if (currentUser.role === 'user') {
                if (userServicesInfo) userServicesInfo.style.display = 'block';
                if (userServicesList) {
                    if (userServices.length > 0) {
                        userServicesList.innerHTML = userServices.map(s => `
                            <span class="service-badge">
                                <i class="fas fa-stethoscope"></i> ${escapeHtml(s.service_name)}
                            </span>
                        `).join('');
                    } else {
                        userServicesList.innerHTML = '<div class="warning-message">No services assigned yet.</div>';
                    }
                }
            } else {
                if (userServicesInfo) userServicesInfo.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading user services:', error);
    }
}

function updateServicesGridWithUserServices() {
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    
    if (userServices.length === 0) {
        container.innerHTML = '<div class="empty-state">No services assigned. Contact admin.</div>';
        return;
    }
    
    container.innerHTML = userServices.map(service => `
        <label class="service-checkbox">
            <input type="checkbox" name="service" value="${service.service_name}" data-price="${service.price}">
            <span>${escapeHtml(service.service_name)}</span>
        </label>
    `).join('');
}

async function loadAccounts() { 

    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) {
            accounts = result.data;
            const container = document.getElementById('accountsList');
            if (container) {
                container.innerHTML = accounts.map(acc => `
                    <div class="data-item">
                        <div class="data-info">
                            <strong>${escapeHtml(acc.account_name)}</strong>
                            <small>${acc.account_type} | ${acc.description || 'No description'}</small>
                        </div>
                        <div class="data-actions">
                            <button onclick="deleteAccount(${acc.id})" class="btn-secondary" style="background:#ef4444;">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
} 

async function loadServicesList() {  


    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();     
        
        if (result.success) {
            services = result.data;
            const container = document.getElementById('servicesList');
            if (container) {
                container.innerHTML = services.map(svc => `
                    <div class="data-item">
                        <div class="data-info">
                            <strong>${escapeHtml(svc.service_name)}</strong>
                            <small> ${svc.category || 'Uncategorized'}</small>
                        </div>
                        <div class="data-actions">
                            <button onclick="deleteService(${svc.id})" class="btn-secondary" style="background:#ef4444;">Delete</button>
                        </div>
                    </div>
                `).join('');
            }   



        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

async function loadAllServicesForAssignment() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) {
            const select = document.getElementById('serviceToAssign');
            if (select) {
                select.innerHTML = '<option value="">Choose a service...</option>' + 
                    result.data.map(svc => `<option value="${svc.id}">${escapeHtml(svc.service_name)}`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading services for assignment:', error);
    }
}

async function loadUsersForServiceAssignment() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) {
            allUsers = result.data;
            const select = document.getElementById('userSelectForServices');
            if (select) {
                const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
                select.innerHTML = '<option value="">Select a user...</option>' + 
                    nonAdminUsers.map(user => `<option value="${user.id}">${escapeHtml(user.username)} (${user.role})</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading users for assignment:', error);
    }
}

async function loadUserServices() {
    const userId = document.getElementById('userSelectForServices').value;
    const userServiceManagement = document.getElementById('userServiceManagement');
    
    if (!userId) {
        if (userServiceManagement) userServiceManagement.style.display = 'none';
        return;
    }
    
    if (userServiceManagement) userServiceManagement.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/services`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();  
        
        if (result.success) {
            const container = document.getElementById('userAssignedServices');
            if (container) {
                if (result.data.length === 0) {
                    container.innerHTML = '<div class="empty-state">No services assigned</div>';
                } else {
                    container.innerHTML = result.data.map(service => `
                        <div class="data-item">
                            <div class="data-info">
                                <strong>${escapeHtml(service.service_name)}</strong>
                                <small>$${service.price}</small>
                            </div>
                            <div class="data-actions">
                                <button onclick="removeUserService(${userId}, ${service.id})" class="btn-secondary" style="background:#ef4444;">Remove</button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading user services:', error);
    }
}

async function loadAccountsForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json(); 

        // console.log('load Accounts:', result)
        
        if (result.success) {
            const select = document.getElementById('accountSelect');
            if (select) {
                select.innerHTML = '<option value="">Select Account Type</option>' + 
                    result.data.map(acc => `<option value="${acc.id}" data-type="${acc.account_type}">${escapeHtml(acc.account_name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

async function loadUsers() { 

  

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) {
            const container = document.getElementById('usersList');
            if (container) {
                container.innerHTML = result.data.map(user => `
                    <div class="data-item">
                        <div class="data-info">
                            <strong>${escapeHtml(user.username)}</strong>
                            <small>Role: ${user.role}</small>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// New function: Load services for filter dropdown
async function loadServicesForFilter() { 



    // console.log('Current user:' , currentUser)
    try {
        const response = await fetch(`${API_BASE_URL}/my-services`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) {
            availableServicesForFilter = result.data;
            const serviceSelect = document.getElementById('filterService');
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="all">All Services</option>' + 
                    availableServicesForFilter.map(svc => `<option value="${svc.service_name}">${escapeHtml(svc.service_name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading services for filter:', error);
    }
}

// Update total count display
async function updateTotalCount(total) {

    console.log('total count:' , total)
    const totalCountSpan = document.getElementById('filteredGrandTotal');
    if (totalCountSpan) {
        totalCountSpan.textContent = `$${total}`;
    }
}  



async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/summary`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();  

        // console.log('summary results' , result)
        
        if (result.success) {
            document.getElementById('totalInvoices').textContent = result.data.totalInvoices;
            document.getElementById('grandTotal').textContent = `GH¢${result.data.grandTotal.toFixed(2)}`;
            document.getElementById('drugsTotal').textContent = `GH¢${result.data.drugsTotal.toFixed(2)}`;
            document.getElementById('nonDrugsTotal').textContent = `GH¢${result.data.nonDrugsTotal.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/activity-log`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();
        
        if (result.success) {
            const previewContainer = document.getElementById('recentActivityPreview');
            if (previewContainer) {
                previewContainer.innerHTML = result.data.slice(0, 5).map(log => `
                    <div class="log-entry">
                        <i class="fas fa-clock"></i>
                        <strong>${escapeHtml(log.user)}</strong>: ${escapeHtml(log.action).substring(0, 80)}
                    </div>
                `).join('') || '<div class="empty-state">No recent activity</div>';
            }
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function logActivity(action) {
    setTimeout(() => {
        loadActivityLog();
        loadRecentActivity();
    }, 500);
} 

// Update assignServiceToUser function
async function assignServiceToUser() {
    const userId = document.getElementById('userSelectForServices').value;
    const serviceId = document.getElementById('serviceToAssign').value;
    
    if (!userId || !serviceId) {
        showMessageModal('Please select both a user and a service', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/services/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ userId, serviceId, assignedBy: currentUser.username })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessageModal('Service assigned successfully!', 'success');
            loadUserServices();
            logActivity(`Assigned service to user ID ${userId}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error assigning service:', error);
        showMessageModal('Error assigning service', 'error');
    }
}
// Update handleAddAccount function
async function handleAddAccount(e) {
    e.preventDefault();
    const accountName = document.getElementById('accountName').value;
    const accountType = document.getElementById('accountTypeSelect').value;
    const description = document.getElementById('accountDescription')?.value || '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ accountName, accountType, description, createdBy: currentUser.username })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessageModal('Account added successfully!', 'success');
            document.getElementById('accountForm').reset();
            loadAccounts();
            loadAccountsForSelect();
            logActivity(`Added new account: ${accountName}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error adding account:', error);
        showMessageModal('Error adding account', 'error');
    }
}

// Update handleAddService function
async function handleAddService(e) {
    e.preventDefault();
    const serviceName = document.getElementById('serviceName').value;
    const description = document.getElementById('serviceDescription')?.value || '';  

    console.log(`Service name :${serviceName}, Description : ${description}`)  ; 

    console.log('current user:' , currentUser)



    
    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ serviceName, description , createdBy: currentUser.username })
        });
        
        const result = await response.json();  

        console.log('results:' , result);
        
        if (result.success) {
            showMessageModal('Service added successfully!', 'success');
            document.getElementById('serviceForm').reset();
            loadServicesList();
            loadAllServicesForAssignment();
            logActivity(`Added new service: ${serviceName}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error adding service:', error);
        showMessageModal('Error adding service', 'error');
    }
}

// Update handleAddUser function
async function handleAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('userRoleSelect').value; 
    const userService = document.getElementById('userServicesListSelect').value   


    const userServices = [] 

    userServices.push(userService)  

    console.log(userServices)


    console.log(`adding ${username} with password ${password} as ${role} with ${userServices} unit service.`)

    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ username, password, role, userServices , createdBy: currentUser.username })
        });
        
        const result = await response.json(); 

        console.log('add user response:', result)
        
        if (result.success) {
            showMessageModal('User added successfully!', 'success');
            document.getElementById('userForm').reset();
            loadUsers();
            loadUsersForServiceAssignment();
            logActivity(`Added new user: ${username}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showMessageModal('Error adding user', 'error');
    }
}

// Load accounts for edit select (keep this function)
async function loadAccountsForEditSelect(selectedAccountId) {
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            headers: { 
                'X-User-Role': currentUser.role, 
                'X-Username': currentUser.username 
            }
        });
        const result = await response.json();
        
        if (result.success) {
            const select = document.getElementById('editAccountSelect');
            if (select) {
                select.innerHTML = '<option value="">Select Account Type</option>' + 
                    result.data.map(acc => `<option value="${acc.id}" data-type="${acc.account_type}" ${acc.id === selectedAccountId ? 'selected' : ''}>${escapeHtml(acc.account_name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading accounts for edit:', error);
    }
}

// load services for user Add Selection  
async function addUserServiceSelect() { 

     try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();     

          if (result.success) {
            const select = document.getElementById('userServicesListSelect');
            if (select) {
                select.innerHTML = '<option value="">Select User Service</option>' + 
                    result.data.map(acc => `<option value="${acc.id}" data-type="${acc.service_name}">${escapeHtml(acc.service_name)}</option>`).join('');
            }   
        
        }
        
    } catch (error) {
        console.error('Error loading accounts for edit:', error);
    }
    
}

// Enhanced handleSubmitInvoice with amount validation
async function handleSubmitInvoice(e) {
    e.preventDefault();
    
    const patientName = document.getElementById('patientName').value.trim();
    const gcrNumber = document.getElementById('gcrNumber').value.trim();
    const accountSelect = document.getElementById('accountSelect');
    const accountId = accountSelect.value;
    const priceInput = document.getElementById('price').value.trim();
    
    // Validate patient name
    if (!patientName) {
        showMessageModal('Please enter patient name', 'warning');
        return;
    }
    
    // Validate GCR number
    if (!gcrNumber || gcrNumber.length !== 8 || !/^\d{8}$/.test(gcrNumber)) {
        showMessageModal('Please enter a valid 8-digit GCR number (numbers only)', 'warning');
        return;
    }
    
    // Validate amount
    if (!priceInput) {
        showMessageModal('Please enter an amount', 'warning');
        return;
    }
    
    const amount = parseFloat(priceInput);
    if (isNaN(amount) || amount <= 0) {
        showMessageModal('Please enter a valid positive amount', 'warning');
        return;
    }
    
    if (!accountId) {
        showMessageModal('Please select an account type', 'warning');
        return;
    }
    
    const selectedServices = [];
    document.querySelectorAll('input[name="service"]:checked').forEach(cb => {
        selectedServices.push({
            name: cb.value,
            price: parseFloat(cb.dataset.price)
        });
    });
    
    if (selectedServices.length === 0) {
        showMessageModal('Please select at least one service', 'warning');
        return;
    }
    
    const newInvoice = {
        patientName,
        gcrNumber,
        accountId: parseInt(accountId),
        services: selectedServices,
        amount: amount,
        createdBy: currentUser.username
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify(newInvoice)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('invoiceModal');
            document.getElementById('invoiceForm').reset();
            loadInvoices();
            loadSummary();
            showMessageModal('Invoice saved successfully!', 'success');
            logActivity(`Created new invoice for ${patientName}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving invoice:', error);
        showMessageModal('Error saving invoice', 'error');
    }
}

function displayServicesEdit(invoiceServices) {
    const container = document.getElementById('editServicesReadOnly');
    
    if (!container) return;
    
    if (!invoiceServices || invoiceServices.length === 0) {
        container.innerHTML = '<div class="empty-state">No services associated with this invoice</div>';
        return;
    }   

    console.log('Invoice services to edit:', invoiceServices);

    // Fetch all available services from the server
    fetch(`${API_BASE_URL}/services`, {
        headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
    }).then(response => response.json())
      .then(result => {
          if (result.success) {
              const allAvailableServices = result.data;
              console.log('All available services fetched:', allAvailableServices);
              
              // Render each invoice service as an editable row
              container.innerHTML = invoiceServices.map((invoiceService, index) => `
                  <div class="service-item-edit" data-service-index="${index}">
                      <div style="flex: 1;">
                          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                              <i class="fas fa-stethoscope" style="color: var(--blue-600);"></i>
                              <select class="service-name-edit" data-service-index="${index}" 
                                      style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--gray-border); flex: 1; min-width: 150px;">
                                  <option value="">Select Service</option>    
                                  ${allAvailableServices.map(availableService => `
                                      <option value="${escapeHtml(availableService.service_name)}"
                                              ${availableService.service_name === invoiceService.service_name ? 'selected' : ''}>
                                          ${escapeHtml(availableService.service_name)}
                                      </option>
                                  `).join('')}
                              </select>
                              <div style="display: flex; align-items: center; gap: 8px;">
                                  <label style="font-size: 12px; color: var(--gray-text);">GH¢</label>
                                  <input type="text" class="service-price-edit" data-service-index="${index}" 
                                         value="${(invoiceService.price || 0).toFixed(2)}" 
                                         style="width: 100px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--gray-border); text-align: right;"
                                         onkeypress="return onlyNumbersAndDecimal(event)" 
                                         oninput="validateAmount(this)">
                              </div>
                          </div>
                      </div>
                  </div>
              `).join('');
              
              // Attach event listeners for service selection changes
              document.querySelectorAll('.service-name-edit').forEach(select => {
                  select.addEventListener('change', function() {
                      const index = parseInt(this.dataset.serviceIndex);
                      const selectedOption = this.options[this.selectedIndex];
                      const price = parseFloat(selectedOption.dataset.price) || 0;
                      const priceInput = document.querySelector(`.service-price-edit[data-service-index="${index}"]`);
                      if (priceInput) {
                          priceInput.value = price.toFixed(2);
                      }
                      updateEditSubtotal();
                  });
              });
              
              // Attach event listeners for price changes
              document.querySelectorAll('.service-price-edit').forEach(input => {
                  input.addEventListener('input', function() {
                      updateEditSubtotal();
                  });
              });
              
              // Initialize subtotal
              updateEditSubtotal();
          } else {
              console.error('Error fetching services for edit:', result.error);
              showMessageModal('Error fetching services for edit', 'error');
          }
      }).catch(error => {
          console.error('Error fetching services:', error);
          showMessageModal('Error loading services for editing', 'error');
      });
}

// Function to update subtotal in edit modal
function updateEditSubtotal() {
    const priceInputs = document.querySelectorAll('.service-price-edit');
    let subtotal = 0;
    
    priceInputs.forEach(input => {
        const price = parseFloat(input.value) || 0;
        subtotal += price;
    });
    
    const subtotalField = document.getElementById('servicePrice');
    if (subtotalField) {
        subtotalField.value = subtotal.toFixed(2);
    }
}




// Update loadInvoiceForEdit to use the editable display
async function loadInvoiceForEdit(invoiceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
            headers: { 
                'X-User-Role': currentUser.role, 
                'X-Username': currentUser.username 
            }
        });
        const result = await response.json();
        
        if (result.success) {
            const invoice = result.data;  
            
            // Populate edit form with invoice data
            document.getElementById('editInvoiceId').value = invoice.id;
            document.getElementById('editPatientName').value = invoice.patient_name;
            document.getElementById('editGcrNumber').value = invoice.gcr_number;
            
            // Load accounts for select
            await loadAccountsForEditSelect(invoice.account_id);
            
            // Display services in EDITABLE mode (not read-only)
            displayServicesEdit(invoice.services);
            
            // Set the initial subtotal
            const subtotalField = document.getElementById('servicePrice');
            if (subtotalField && invoice.price) {
                subtotalField.value = invoice.price.toFixed(2);
            }
        }
    } catch (error) {
        console.error('Error loading invoice for edit:', error);
        showMessageModal('Error loading invoice details', 'error');
    }
}


// Update handleEditInvoice to collect edited services
async function handleEditInvoice(e) {
    e.preventDefault();
    
    const invoiceId = document.getElementById('editInvoiceId').value;
    const patientName = document.getElementById('editPatientName').value.trim();
    const gcrNumber = document.getElementById('editGcrNumber').value.trim();
    const accountId = document.getElementById('editAccountSelect').value;
    
    if (!patientName) {
        showMessageModal('Please enter patient name', 'warning');
        return;
    }
    
    if (!gcrNumber || gcrNumber.length !== 8 || !/^\d{8}$/.test(gcrNumber)) {
        showMessageModal('Please enter a valid 8-digit GCR number (numbers only)', 'warning');
        return;
    }
    
    if (!accountId) {
        showMessageModal('Please select an account type', 'warning');
        return;
    }
    
    // Collect services from the editable list
    const selectedServices = [];
    const serviceItems = document.querySelectorAll('.service-item-edit');
    
    serviceItems.forEach(item => {
        const select = item.querySelector('.service-name-edit');
        const priceInput = item.querySelector('.service-price-edit');
        
        if (select && select.value && priceInput) {
            const serviceName = select.value;
            const price = parseFloat(priceInput.value) || 0;
            
            selectedServices.push({
                name: serviceName,
                price: price
            });
        }
    });
    
    if (selectedServices.length === 0) {
        showMessageModal('Please add at least one service', 'warning');
        return;
    }
    
    // Calculate total from services
    const subtotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    
    const updatedInvoice = {
        patientName,
        gcrNumber,
        accountId: parseInt(accountId),
        services: selectedServices,
        amount: subtotal,
        updatedBy: currentUser.username
    };
    
    console.log('Updated invoice data:', updatedInvoice);
    
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify(updatedInvoice)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('editInvoiceModal');
            loadInvoices();
            loadSummary();
            showMessageModal('Invoice updated successfully!', 'success');
            logActivity(`Updated invoice #${invoiceId}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating invoice:', error);
        showMessageModal('Error updating invoice', 'error');
    }
}















// End update 


async function loadActivityLog() {
    try {        
        const response = await fetch(`${API_BASE_URL}/activity-log`, {
            headers: { 'X-User-Role': currentUser.role, 'X-Username': currentUser.username }
        });
        const result = await response.json();  

       
        const container = document.getElementById('activityLogContainer');
        
        if (!container) {
            console.error('Container with id "activityLogContainer" not found!');
            return;
        }
        
        // Check if we have data
        if (result.success && result.data) {
            let logsArray = result.data;
            
            // Handle nested array structure
            if (Array.isArray(logsArray) && logsArray.length === 1 && Array.isArray(logsArray[0])) {
                logsArray = logsArray[0];
            }
            
            
            if (logsArray && logsArray.length > 0) {
                // Clear container first
                container.innerHTML = '';
                
                // Render the logs
                logsArray.forEach(log => {
                    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No date';
                    const user = log.user || log.username || 'Unknown';
                    const action = log.action || log.description || 'No action';
                    
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <strong>[${timestamp}]</strong>
                        <strong style="color:var(--blue-600);">${escapeHtml(user)}</strong>: ${escapeHtml(action)}
                    `;
                    container.appendChild(logEntry);
                });
                
            } else {
              
                container.innerHTML = '<div class="empty-state">No activity recorded</div>';
            }
        } else {
            container.innerHTML = '<div class="empty-state">No activity recorded</div>';
        }
    } catch (error) {
        console.error('Error loading activity log:', error);
        const container = document.getElementById('activityLogContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading activity log: ' + error.message + '</div>';
        }
    }
}   

// Get currently filtered invoices (respects all active filters)
function getCurrentFilteredInvoices() {
    const accountType = document.getElementById('filterAccountType')?.value || 'all';
    const serviceName = document.getElementById('filterService')?.value || 'all';
    const searchTerm = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const dateFrom = currentDateRange?.from || null;
    const dateTo = currentDateRange?.to || null;
    
    let filtered = [...allInvoices];
    
    // Filter by date range
    if (dateFrom || dateTo) {
        filtered = filtered.filter(inv => {
            const invDate = new Date(inv.timestamp);
            if (dateFrom && dateTo) {
                const fromDate = new Date(dateFrom);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate >= fromDate && invDate <= toDate;
            } else if (dateFrom) {
                const fromDate = new Date(dateFrom);
                return invDate >= fromDate;
            } else if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                return invDate <= toDate;
            }
            return true;
        });
    }
    
    // Filter by account type
    if (accountType !== 'all') {
        filtered = filtered.filter(inv => inv.account_name === accountType);
    }
    
    // Filter by service
    if (serviceName !== 'all') {
        filtered = filtered.filter(inv => {
            if (inv.services && inv.services.length > 0) {
                return inv.services.some(s => (s.service_name || s.name) === serviceName);
            }
            return false;
        });
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(inv => 
            inv.patient_name.toLowerCase().includes(searchTerm) ||
            inv.gcr_number.includes(searchTerm)
        );
    }
    
    return filtered;
}

// Build unique services from filtered invoices for print view
function buildPrintServicesList(invoices) {
    const serviceMap = new Map();
    invoices.forEach(invoice => {
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                if (!serviceMap.has(serviceName)) {
                    serviceMap.set(serviceName, {
                        name: serviceName,
                        price: service.price || 0
                    });
                }
            });
        }
    });
    return Array.from(serviceMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function renderPrintTable(invoices) {
    const container = document.getElementById('printTableContainer');
    const recordCountSpan = document.getElementById('printRecordCount');
    const grandTotalSpan = document.getElementById('printGrandTotal');
    
    // Double-check we're not rendering multiple times
    if (!container) return;
    
    // Clear the container completely before rendering
    container.innerHTML = '';
    
    if (!invoices || invoices.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 60px;">No records to display</div>';
        if (recordCountSpan) recordCountSpan.textContent = '0 Records';
        if (grandTotalSpan) grandTotalSpan.textContent = 'GH¢0.00';
        return;
    }
    
    // Get unique services from filtered invoices
    const uniqueServices = buildPrintServicesList(invoices);
    
    // Calculate service subtotals and grand total
    const serviceTotals = new Map();
    uniqueServices.forEach(service => serviceTotals.set(service.name, 0));
    let grandTotal = 0;
    
    invoices.forEach(invoice => {
        grandTotal += invoice.price || 0;
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                const servicePrice = service.price || 0;
                if (serviceTotals.has(serviceName)) {
                    serviceTotals.set(serviceName, serviceTotals.get(serviceName) + servicePrice);
                }
            });
        }
    });
    
    // Build table HTML
    let html = `
        <div class="print-table-responsive">
            <table class="print-table" style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid var(--gray-border);">
                <thead>
                    <tr style="background: var(--gray-light); border-bottom: 2px solid var(--gray-border);">
                        <th style="padding: 12px 10px; text-align: left; font-weight: 600; border-right: 1px solid var(--gray-border);">Date & Time</th>
                        <th style="padding: 12px 10px; text-align: left; font-weight: 600; border-right: 1px solid var(--gray-border);">Name</th>
                        <th style="padding: 12px 10px; text-align: left; font-weight: 600; border-right: 1px solid var(--gray-border);">GCR #</th>
                        <th style="padding: 12px 10px; text-align: left; font-weight: 600; border-right: 1px solid var(--gray-border);">Account</th>
    `;
    
    // Add service columns
    uniqueServices.forEach((service) => {
        html += `<th style="padding: 12px 10px; text-align: center; font-weight: 600; border-right: 1px solid var(--gray-border);">${escapeHtml(service.name)}</th>`;
    });
    
    html += `
                        <th style="padding: 12px 10px; text-align: right; font-weight: 600;">Amount (GH¢)</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Table body - each invoice
    invoices.forEach((invoice, rowIndex) => {
        // Create service map for this invoice
        const invoiceServiceMap = new Map();
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                invoiceServiceMap.set(serviceName, service.price || 0);
            });
        }
        
        // Determine account badge and type
        const isDrugsAccount = invoice.account_name === 'Drugs Account' || invoice.account_type === 'drugs';
        const accountLabel = isDrugsAccount ? 'Drugs' : 'Non-Drugs';
        const badgeStyle = isDrugsAccount 
            ? 'background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;'
            : 'background: #fed7aa; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;';
        
        const rowBgColor = rowIndex % 2 === 0 ? 'background: var(--white);' : 'background: var(--gray-light);';
        
        html += `
                    <tr style="${rowBgColor} border-bottom: 1px solid var(--gray-border);">
                        <td style="padding: 10px 10px; border-right: 1px solid var(--gray-border);">${new Date(invoice.timestamp).toLocaleString()}</td>
                        <td style="padding: 10px 10px; border-right: 1px solid var(--gray-border);"><strong>${escapeHtml(invoice.patient_name)}</strong></td>
                        <td style="padding: 10px 10px; border-right: 1px solid var(--gray-border); font-family: monospace;">${invoice.gcr_number}</td>
                        <td style="padding: 10px 10px; border-right: 1px solid var(--gray-border);">
                            <span style="${badgeStyle}">${escapeHtml(accountLabel)}</span>
                        </td>
        `;
        
        // Service columns - show checkmark and price if service exists
        uniqueServices.forEach(service => {
            const hasService = invoiceServiceMap.has(service.name);
            if (hasService) {
                const servicePrice = invoiceServiceMap.get(service.name);
                html += `
                    <td style="padding: 10px 10px; text-align: center; border-right: 1px solid var(--gray-border);">
                        <span style="color: #10b981; font-size: 16px; font-weight: bold; display: inline-block;">✓</span>
                        <small style="display: block; font-size: 10px; color: var(--blue-600);">GH¢${servicePrice.toFixed(2)}</small>
                    </td>
                `;
            } else {
                html += `
                    <td style="padding: 10px 10px; text-align: center; border-right: 1px solid var(--gray-border);">
                        <span style="color: #ef4444; font-size: 16px; font-weight: bold;">✗</span>
                    </td>
                `;
            }
        });
        
        html += `
                        <td style="padding: 10px 10px; text-align: right; font-weight: bold;">GH¢${(invoice.price || 0).toFixed(2)}</td>
                    </tr>
        `;
    });
    
    // Subtotal row
    html += `
                </tbody>
                <tfoot>
                    <tr style="background: #eef2ff; font-weight: bold; border-top: 2px solid var(--blue-600); border-bottom: 1px solid var(--blue-300);">
                        <td colspan="4" style="padding: 12px 10px; text-align: right; font-weight: bold; border-right: 1px solid var(--gray-border);">
                            <strong>SERVICE SUBTOTALS:</strong>
                        </td>
    `;
    
    uniqueServices.forEach(service => {
        const subtotal = serviceTotals.get(service.name) || 0;
        html += `<td style="padding: 12px 10px; text-align: center; color: var(--blue-600); font-weight: bold; border-right: 1px solid var(--gray-border);">GH¢${subtotal.toFixed(2)}</td>`;
    });
    
    html += `<td style="padding: 12px 10px; text-align: right;"></td></tr>`;
    
    // Grand total row
    html += `
                    <tr style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1)); font-weight: bold; border-top: 2px solid var(--blue-600); border-bottom: 2px solid var(--blue-600);">
                        <td colspan="4" style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 14px; border-right: 1px solid var(--gray-border);">
                            <strong>GRAND TOTAL:</strong>
                        </td>
    `;
    
    uniqueServices.forEach(() => {
        html += `<td style="padding: 12px 10px; text-align: center;"></td>`;
    });
    
    html += `<td style="padding: 12px 10px; text-align: right; font-size: 16px; color: var(--blue-700);"><strong>GH¢${grandTotal.toFixed(2)}</strong></td>`;
    html += `</tr>
                </tfoot>
            </table>
        </div>
    `;
    
    // Set the HTML content
    container.innerHTML = html;   
  
    
    // Update stats
    if (recordCountSpan) recordCountSpan.textContent = `${invoices.length} Records`;
    if (grandTotalSpan) grandTotalSpan.textContent = `GH¢${grandTotal.toFixed(2)}`;   

}

function printPrintModal() {
    if (isPrinting) return;
    isPrinting = true;     
    // Small delay to ensure modal is fully visible and content is rendered
    setTimeout(() => {
        // Remove any existing afterprint handler to avoid duplicates
        const oldHandler = window.onafterprint;
        window.onafterprint = null;
        
        // Set up the afterprint handler
        window.onafterprint = function() {
            // Reset flags and close modal after print is complete
            setTimeout(function() {
                closePrintModal();
                isPrinting = false;
                window.onafterprint = null;
            }, 200);
        };
        
        // Log for debugging
        console.log('Triggering print dialog...');
        
        // Trigger print
        window.print();
        
        // Fallback timeout in case afterprint doesn't fire
        setTimeout(function() {
            if (isPrinting) {
                console.log('Print timeout - closing modal');
                closePrintModal();
                isPrinting = false;
                window.onafterprint = null;
            }
        }, 5000);
    }, 200);
}

function openPrintModal() {
    // Prevent multiple openings
    if (isPrintModalOpen || isRenderingPrint) {
        console.log('Print modal already opening or open');
        return;
    }
    
    const printModal = document.getElementById('printModal');
    if (printModal && printModal.classList.contains('active')) {
        return;
    }
    
    const filteredInvoices = getCurrentFilteredInvoices();
    
    if (filteredInvoices.length === 0) {
        showMessageModal('No records to display. Please adjust your filters.', 'warning');
        return;
    }
    
    // Set flag to prevent multiple opens
    isPrintModalOpen = true;
    isRenderingPrint = true;
    
    // Clear previous content before rendering
    const container = document.getElementById('printTableContainer');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';
    }

  
    
    // Small delay to ensure DOM is ready before rendering
    setTimeout(() => {
        try {
            renderPrintTable(filteredInvoices);
            isRenderingPrint = false;
            showModal('printModal');
        } catch (error) {
            console.error('Error rendering print table:', error);
            isRenderingPrint = false;
            isPrintModalOpen = false;
            showMessageModal('Error loading print preview', 'error');
        }
    }, 100);
}

function closePrintModal() {
    closeModal('printModal');
    // Clear the container content to prevent stale data
    const container = document.getElementById('printTableContainer');
    if (container) {
        container.innerHTML = '';
    }
    // Reset flags
    isPrintModalOpen = false;
    isRenderingPrint = false;
}



// Export to Excel (CSV format)
function exportToExcel() {
    const filteredInvoices = getCurrentFilteredInvoices();
    
    if (filteredInvoices.length === 0) {
        showMessageModal('No records to export. Please adjust your filters.', 'warning');
        return;
    }
    
    // Get unique services for columns
    const uniqueServices = buildPrintServicesList(filteredInvoices);
    
    // Prepare CSV data
    const headers = ['Date & Time', 'Patient Name', 'GCR Number', 'Account Type', ...uniqueServices.map(s => s.name), 'Total Amount ($)'];
    
    const rows = filteredInvoices.map(invoice => {
        // Create service map for this invoice
        const invoiceServiceMap = new Map();
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                invoiceServiceMap.set(serviceName, service.price || 0);
            });
        }
        
        const row = [
            new Date(invoice.timestamp).toLocaleString(),
            invoice.patient_name,
            invoice.gcr_number,
            invoice.account_name || invoice.account_type || 'N/A',
            ...uniqueServices.map(service => {
                if (invoiceServiceMap.has(service.name)) {
                    return invoiceServiceMap.get(service.name).toFixed(2);
                }
                return '';
            }),
            (invoice.price || 0).toFixed(2)
        ];
        
        return row;
    });
    
    // Calculate totals row
    const serviceTotals = new Map();
    uniqueServices.forEach(service => serviceTotals.set(service.name, 0));
    let grandTotal = 0;
    
    filteredInvoices.forEach(invoice => {
        grandTotal += invoice.price || 0;
        if (invoice.services && invoice.services.length > 0) {
            invoice.services.forEach(service => {
                const serviceName = service.service_name || service.name;
                serviceTotals.set(serviceName, (serviceTotals.get(serviceName) || 0) + (service.price || 0));
            });
        }
    });
    
    const totalsRow = [
        'TOTAL',
        '',
        '',
        'SERVICE SUBTOTALS:',
        ...uniqueServices.map(service => serviceTotals.get(service.name)?.toFixed(2) || '0.00'),
        grandTotal.toFixed(2)
    ];
    
    const grandTotalRow = [
        'GRAND TOTAL',
        '',
        '',
        '',
        ...Array(uniqueServices.length).fill(''),
        grandTotal.toFixed(2)
    ];
    
    // Combine all rows
    const allRows = [headers, ...rows, totalsRow, grandTotalRow];
    
    // Convert to CSV
    const csvContent = allRows.map(row => 
        row.map(cell => {
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')
    ).join('\n');
    
    // Add UTF-8 BOM for proper Unicode support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mediledger_records_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessageModal(`Exported ${filteredInvoices.length} records to Excel/CSV successfully!`, 'success');
} 

// ============================================
// MOBILE SIDEBAR FUNCTIONALITY
// ============================================


// Function to close mobile sidebar
function closeMobileSidebar() {
    if (window.innerWidth <= 992) {
        sidebar.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
}

// Function to open mobile sidebar
function openMobileSidebar() {
    if (window.innerWidth <= 992) {
        sidebar.classList.add('mobile-open');
        document.body.classList.add('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }
}

// Toggle sidebar when menu button is clicked
if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('mobile-open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    });
}

// Close sidebar when overlay is clicked
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

 
// Select all navigation items (including admin-only ones)
const allNavItems = document.querySelectorAll('.nav-item');

allNavItems.forEach(item => {
    // Remove any existing listeners to avoid duplicates
    item.removeEventListener('click', closeMobileSidebarHandler);
    // Add new listener
    item.addEventListener('click', closeMobileSidebarHandler);
});

// Handler function for closing sidebar on nav click
function closeMobileSidebarHandler() {
    // Check if we're in responsive mode (screen width <= 992px)
    if (window.innerWidth <= 992) {
        // Small delay to ensure the section switch happens smoothly
        setTimeout(() => {
            closeMobileSidebar();
        }, 150);
    }
}

// Close sidebar when clicking on logout button in responsive mode
const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');
if (logoutBtnSidebar) {
    logoutBtnSidebar.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
            setTimeout(() => {
                closeMobileSidebar();
            }, 150);
        }
    });
}

// Close sidebar when window is resized to desktop view
window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
        // If resizing to desktop, ensure sidebar is visible and overlay is removed
        sidebar.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
});

// Close sidebar when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.innerWidth <= 992 && sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
    }
});

// Prevent sidebar from closing when clicking inside sidebar content
if (sidebar) {
    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

window.removeUserService = async function(userId, serviceId) {
    if (!confirm('Remove this service from the user?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ deletedBy: currentUser.username })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Service removed successfully!');
            loadUserServices();
            logActivity(`Removed service from user ID ${userId}`);
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error removing service:', error);
    }
};

window.deleteInvoice = async function(id) {
    if (currentUser.role !== 'admin') {
        alert('Only admin can delete invoices');
        return;
    }
    
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': currentUser.role,
                    'X-Username': currentUser.username
                },
                body: JSON.stringify({ deletedBy: currentUser.username })
            });
            
            const result = await response.json();
            if (result.success) {
                loadInvoices();
                loadSummary();
                alert('Invoice deleted successfully');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
        }
    }
};

window.deleteAccount = async function(id) {
    if (!confirm('Delete this account?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ deletedBy: currentUser.username })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Account deleted');
            loadAccounts();
            loadAccountsForSelect();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting account:', error);
    }
};

window.deleteService = async function(id) {
    if (!confirm('Delete this service?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/services/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ deletedBy: currentUser.username })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Service deleted');
            loadServicesList();
            loadAllServicesForAssignment();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting service:', error);
    }
};

// Update the editInvoice function to use the modal
window.editInvoice = async function(id) {
    if (currentUser.role !== 'admin') {
        showMessageModal('Only admin can edit invoices', 'warning');
        return;
    }
    
    // Load invoice data and show modal
    await loadInvoiceForEdit(id);
    showModal('editInvoiceModal');
};

// Update the deleteInvoice function to maintain consistency
window.deleteInvoice = async function(id) {
    if (currentUser.role !== 'admin') {
        showMessageModal('Only admin can delete invoices', 'warning');
        return;
    }
    
    showConfirmModal('Are you sure you want to delete this invoice?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': currentUser.role,
                    'X-Username': currentUser.username
                },
                body: JSON.stringify({ deletedBy: currentUser.username })
            });
            
            const result = await response.json();
            if (result.success) {
                loadInvoices();
                loadSummary();
                showMessageModal('Invoice deleted successfully', 'success');
                logActivity(`Deleted invoice #${id}`);
            } else {
                showMessageModal('Error: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            showMessageModal('Error deleting invoice', 'error');
        }
    });
};

// Update removeUserService function
window.removeUserService = async function(userId, serviceId) {
    showConfirmModal('Remove this service from the user?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/services/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': currentUser.role,
                    'X-Username': currentUser.username
                },
                body: JSON.stringify({ deletedBy: currentUser.username })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessageModal('Service removed successfully!', 'success');
                loadUserServices();
                logActivity(`Removed service from user ID ${userId}`);
            } else {
                showMessageModal('Error: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error removing service:', error);
            showMessageModal('Error removing service', 'error');
        }
    });
};

// Update deleteInvoice function
window.deleteInvoice = async function(id) {
    if (currentUser.role !== 'admin') {
        showMessageModal('Only admin can delete invoices', 'warning');
        return;
    }
    
    showConfirmModal('Are you sure you want to delete this invoice?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': currentUser.role,
                    'X-Username': currentUser.username
                },
                body: JSON.stringify({ deletedBy: currentUser.username })
            });
            
            const result = await response.json();
            if (result.success) {
                loadInvoices();
                loadSummary();
                showMessageModal('Invoice deleted successfully', 'success');
            } else {
                showMessageModal('Error: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            showMessageModal('Error deleting invoice', 'error');
        }
    });
};

// Update deleteAccount function
window.deleteAccount = async function(id) {
    showConfirmModal('Delete this account?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': currentUser.role,
                    'X-Username': currentUser.username
                },
                body: JSON.stringify({ deletedBy: currentUser.username })
            });
            
            const result = await response.json();
            if (result.success) {
                showMessageModal('Account deleted', 'success');
                loadAccounts();
                loadAccountsForSelect();
            } else {
                showMessageModal('Error: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            showMessageModal('Error deleting account', 'error');
        }
    });
};

// Update deleteService function
window.deleteService = async function(id) {
    showConfirmModal('Delete this service?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/services/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': currentUser.role,
                    'X-Username': currentUser.username
                },
                body: JSON.stringify({ deletedBy: currentUser.username })
            });
            
            const result = await response.json();
            if (result.success) {
                showMessageModal('Service deleted', 'success');
                loadServicesList();
                loadAllServicesForAssignment();
            } else {
                showMessageModal('Error: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            showMessageModal('Error deleting service', 'error');
        }
    });
};  


// Custom print function to prevent double printing

// Make it globally available
window.printPrintModal = printPrintModal;

// Make functions globally available
window.switchSection = switchSection;
window.editInvoice = editInvoice;
window.deleteInvoice = deleteInvoice;
window.deleteAccount = deleteAccount;
window.deleteService = deleteService;
window.assignServiceToUser = assignServiceToUser;
window.removeUserService = removeUserService;
window.loadUserServices = loadUserServices;