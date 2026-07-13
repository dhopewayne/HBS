// const { json } = require("body-parser");


// API Base URL
const API_BASE_URL = '/api'; 
// State management
let isFilterCollapsed = true;
let currentUser = null;
let accounts = [];
let services = [];
let userServices = [];
let allUsers = [];
let allInvoices = [];
let availableServicesForFilter = [];
let currentInvoiceView = 'serviceColumns';
let allUniqueServices = [];
let currentDateRange = {from: null,to: null}; 
let serviceColumnsCurrentPage = 1;
let serviceColumnsPageSize = 100;
let serviceColumnsFilteredData = [];
let currentEditingUser = null;
let currentEditAction = null;
let isPrinting = false;
let isPrintModalOpen = false;
let isRenderingPrint = false; 
let allUsersList = [];
let selectedUserForServices = null;
let allServicesList = [];
let userAssignedServicesList = [];
let availableServicesFilter = '';
let assignedServicesFilter = '';



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
    loadFilterCollapseState();
});

// Update copyright year
function updateCopyrightYear() {
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}    

// Role-based permission checks
const hasPermission = {
    // User permissions (all authenticated users)
    canAddInvoice: () => ['user', 'user-admin', 'admin', 'master'].includes(currentUser?.role),
    canViewPersonalActivities: () => ['user', 'user-admin', 'admin', 'master'].includes(currentUser?.role),
    canEditOwnProfile: () => ['user', 'user-admin', 'admin', 'master'].includes(currentUser?.role),
    canViewDashboard: () => ['user', 'user-admin', 'admin', 'master'].includes(currentUser?.role),
    canViewInvoices: () => ['user', 'user-admin', 'admin', 'master'].includes(currentUser?.role),
    canViewActivityLog: () => ['user', 'user-admin', 'admin', 'master'].includes(currentUser?.role),
    
    // User-Admin permissions (user-admin and above)
    canEditInvoice: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canAssignUserRoles: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canChangeUserPassword: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canSuspendUser: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canBlockUser: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canViewUserActivities: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canChangeUserSex: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canChangeUserDOB: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    canViewUsersList: () => ['user-admin', 'admin', 'master'].includes(currentUser?.role),
    
    // Admin permissions (admin and master)
    canDeleteUser: () => ['admin', 'master'].includes(currentUser?.role),
    canAddUser: () => ['admin', 'master'].includes(currentUser?.role),
    canAddService: () => ['admin', 'master'].includes(currentUser?.role),
    canDeleteUserAdmin: () => ['admin', 'master'].includes(currentUser?.role),
    canManageAccounts: () => ['admin', 'master'].includes(currentUser?.role),
    canManageServices: () => ['admin', 'master'].includes(currentUser?.role),
    canManageUserServices: () => ['admin', 'master'].includes(currentUser?.role),
    
    // Master permissions (master only)
    canBlockAdmin: () => currentUser?.role === 'master',
    canSuspendAdmin: () => currentUser?.role === 'master',
    canDeleteAdmin: () => currentUser?.role === 'master',
    canViewAdminActivities: () => currentUser?.role === 'master',
    canCreateMaster: () => false,
};

// Get role display name
function getRoleDisplayName(role) {
    const roleNames = {
        'master': 'Master Administrator',
        'admin': 'Administrator',
        'user-admin': 'User Administrator',
        'user': 'User'
    };
    return roleNames[role] || 'User';
}

// Get role icon
function getRoleIcon(role) {
    const icons = {
        'master': 'fa-crown',
        'admin': 'fa-shield-alt',
        'user-admin': 'fa-user-cog',
        'user': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

// Get role color
function getRoleColor(role) {
    const colors = {
        'master': 'linear-gradient(135deg, #f59e0b, #ef4444)',
        'admin': 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        'user-admin': 'linear-gradient(135deg, #3b82f6, #2563eb)',
        'user': 'linear-gradient(135deg, #10b981, #059669)'
    };
    return colors[role] || 'linear-gradient(135deg, #6b7280, #4b5563)';
}

// Update UI based on user role
function updateUIByRole() {
    // Admin-only elements (admin and master)
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    // User-admin only elements
    const userAdminOnlyElements = document.querySelectorAll('.user-admin-only');
    // Master only elements
    const masterOnlyElements = document.querySelectorAll('.master-only');
    
    // Admin and master can see admin-only elements
    if (hasPermission.canAddUser()) {
        adminOnlyElements.forEach(el => el.style.display = 'flex');
    } else {
        adminOnlyElements.forEach(el => el.style.display = 'none');
    }
    
    // User-admin, admin, and master can see user-admin elements
    if (hasPermission.canAssignUserRoles()) {
        userAdminOnlyElements.forEach(el => el.style.display = 'flex');
    } else {
        userAdminOnlyElements.forEach(el => el.style.display = 'none');
    }
    
    // Only master can see master-only elements
    if (hasPermission.canBlockAdmin()) {
        masterOnlyElements.forEach(el => el.style.display = 'flex');
    } else {
        masterOnlyElements.forEach(el => el.style.display = 'none');
    }
    
    // Update sidebar navigation visibility
    updateSidebarNavigation();
    
    // Update dashboard stats visibility
    updateDashboardStatsVisibility();
}

// Update sidebar navigation based on role
function updateSidebarNavigation() {
    const navItems = {
        dashboard: document.querySelector('.nav-item[data-section="dashboard"]'),
        invoices: document.querySelector('.nav-item[data-section="invoices"]'),
        account: document.querySelector('.nav-item[data-section="account"]'),
        activity: document.querySelector('.nav-item[data-section="activity"]'),
        users: document.querySelector('.nav-item[data-section="users"]'),
        accounts: document.querySelector('.nav-item[data-section="accounts"]'),
        services: document.querySelector('.nav-item[data-section="services"]'),
        'user-services': document.querySelector('.nav-item[data-section="user-services"]')
    };
    
    // Always visible for all roles
    if (navItems.dashboard) navItems.dashboard.style.display = 'flex';
    if (navItems.invoices) navItems.invoices.style.display = 'flex';
    if (navItems.account) navItems.account.style.display = 'flex';
    if (navItems.activity) navItems.activity.style.display = 'flex';
    
    // User-admin and above can see users
    if (navItems.users) {
        navItems.users.style.display = hasPermission.canViewUsersList() ? 'flex' : 'none';
    }
    
    // Admin and above can see accounts, services, user-services
    if (navItems.accounts) {
        navItems.accounts.style.display = hasPermission.canManageAccounts() ? 'flex' : 'none';
    }
    
    if (navItems.services) {
        navItems.services.style.display = hasPermission.canManageServices() ? 'flex' : 'none';
    }
    
    if (navItems['user-services']) {
        navItems['user-services'].style.display = hasPermission.canManageUserServices() ? 'flex' : 'none';
    }
}

// Update dashboard stats visibility based on role
function updateDashboardStatsVisibility() {
    // Drug/Non-Drug stats - visible to all
    const drugsTotalCard = document.getElementById('drugsTotalCard');
    const nonDrugsTotalCard = document.getElementById('nonDrugsTotalCard');
    
    if (drugsTotalCard) drugsTotalCard.style.display = 'flex';
    if (nonDrugsTotalCard) nonDrugsTotalCard.style.display = 'flex';
}

// Update user role badge in sidebar and top bar
function updateUserRoleBadge() {
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const topUserRole = document.getElementById('topUserRole');
    
    const roleDisplay = getRoleDisplayName(currentUser?.role);
    const roleClass = currentUser?.role || 'user';
    const roleColor = getRoleColor(currentUser?.role);
    
    if (sidebarUserRole) {
        sidebarUserRole.textContent = roleDisplay;
        sidebarUserRole.style.background = roleColor;
        sidebarUserRole.style.color = 'white';
        sidebarUserRole.style.padding = '4px 12px';
        sidebarUserRole.style.borderRadius = '20px';
        sidebarUserRole.style.fontSize = '12px';
        sidebarUserRole.style.fontWeight = '600';
        sidebarUserRole.style.display = 'inline-block';
        sidebarUserRole.style.textAlign = 'center';
    }
    
    if (topUserRole) {
        topUserRole.textContent = roleDisplay;
        topUserRole.style.background = roleColor;
        topUserRole.style.color = 'white';
        topUserRole.style.padding = '4px 12px';
        topUserRole.style.borderRadius = '20px';
        topUserRole.style.fontSize = '11px';
        topUserRole.style.fontWeight = '600';
        topUserRole.style.display = 'inline-block';
    }
}

// Add this to all API fetch calls
function getApiHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-User-Role': currentUser?.role || ' ',
        'X-Username': currentUser?.username || '' , 
        'X-User-Special-Id': currentUser?.special_id || ''
    };
}

function setupEventListeners() {
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('logoutBtnSidebar')?.addEventListener('click', handleLogout);
    document.getElementById('invoiceForm')?.addEventListener('submit', handleSubmitInvoice);
    document.getElementById('showCreateInvoiceBtn')?.addEventListener('click', () => showModal('invoiceModal'));
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
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            if (section === 'invoices' && !isFilterCollapsed) {
                toggleFilterCollapse();
            }
        });
    });
    
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
    
    const addAccountForm = document.getElementById('addAccountForm');
    if (addAccountForm) addAccountForm.addEventListener('submit', handleModalAddAccount);
    
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) addServiceForm.addEventListener('submit', handleModalAddService);
    
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) addUserForm.addEventListener('submit', handleModalAddUser);
    
    setupFilterEventListeners();   
    setupProfileEventListeners();  
    passwordMatch();
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed'); 
            if (sidebar.classList.contains('collapsed')) {  
                document.querySelectorAll('.logo').forEach(el => el.style.display = 'none');  
                document.querySelectorAll('.copyright').forEach(el => el.style.display = 'none'); 
            } else {
                document.querySelectorAll('.logo').forEach(el => el.style.display = 'flex'); 
                document.querySelectorAll('.copyright').forEach(el => el.style.display = 'block');
            }
        });
    }
}

function switchSection(section) {
    const sectionMap = {
        'account': 'accountSection',
        'dashboard': 'dashboardSection',
        'invoices': 'invoicesSection',
        'accounts': 'accountsSection',
        'services': 'servicesSection',
        'user-services': 'userServicesSection',
        'users': 'usersSection',
        'activity': 'activitySection' 
    };
    
    const sectionId = sectionMap[section];
    document.querySelectorAll('.content-section').forEach(el => {  

        const checkActive  = el.classList.contains('active')  

        checkActive?el.classList.remove('active'):''        
    });
    const targetSection = document.getElementById(sectionId); 
    if (targetSection) {
        targetSection.classList.add('active')
    
    };  
    const sectionTitles = {
        dashboard: 'Dashboard',
        invoices: 'Records Management',
        accounts: 'Account Management',
        services: 'Service Management',
        'user-services': 'User Service Assignments',
        users: 'User Management',
        activity: 'Activity Log',
        account: 'Account Profile'
    };
    
    const headerTitle = document.getElementById('currentSectionTitle');
    if (headerTitle) headerTitle.textContent = sectionTitles[section] || 'Dashboard';
    
    // Load data based on section and permissions
    // if (section === 'accounts' && hasPermission.canManageAccounts()) loadAccounts();
    // if (section === 'services' && hasPermission.canManageServices()) loadServicesList();
    if (section === 'user-services' && hasPermission.canManageUserServices()) {
        loadUsersForServiceAssignment();
        setupUserServicesEventListeners();
        loadAllServicesForAssignment();
        const userServiceManagement = document.getElementById('userServiceManagement');
        if (userServiceManagement) userServiceManagement.style.display = 'none';
    }
    if (section === 'users' && hasPermission.canViewUsersList()) {
        loadUsers();
        addUserServiceSelect(); 
        loadAssignmentToAddUserModal();
    }
    if (section === 'activity') loadActivityLog();
    if (section === 'dashboard') {
        loadSummary();
        loadRecentActivity();
    }
    if (section === 'invoices') {
        loadInvoices(); 
        toggleFilterCollapse();
    }
    if (section === 'account') loadAccountProfile();   

    if (section === 'services' && hasPermission.canManageServices()) {
        loadServicesList();
        setupServiceFilters();
    }   

    if (section === 'accounts' && hasPermission.canManageAccounts()) {
        loadAccounts();
        setupAccountFilters();
    }
 



}

function showModal(modalId) {
    const modal = document.getElementById(modalId); 
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

function updateFilteredCount(count) {
    const filteredCountSpan = document.getElementById('filteredCount');
    if (filteredCountSpan) {
        filteredCountSpan.textContent = count;
    }
}

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
    
    modal.classList.remove('success', 'error', 'warning', 'info');
    modal.classList.add(type);
    modal.classList.add('active');
    
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

function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('messageModal');
    const icon = document.getElementById('messageIcon');
    const titleElement = document.getElementById('messageTitle');
    const textElement = document.getElementById('messageText');
    const footer = document.querySelector('.message-modal-footer');
    
    icon.className = 'fas fa-exclamation-triangle';
    titleElement.textContent = 'Confirm Action';
    textElement.textContent = message;
    
    modal.classList.remove('success', 'error', 'warning', 'info');
    modal.classList.add('warning');
    
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
        footer.innerHTML = `<button id="messageConfirmBtn" class="message-btn message-btn-primary">OK</button>`;
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

function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessageModal('Please enter both username and password.', 'error');
        return;
    }
    
    fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            currentUser = result.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            logActivity('User logged in');
            showDashboard();
        } else {
            showMessageModal(result.message || 'Login failed. Please try again.', 'error');
        }
    });
}

async function getCurrentUser(){  

     const response = await fetch(`${API_BASE_URL}/users/current`, {
            headers: getApiHeaders()
        }); 

    const result  = await response.json() ; 

 
    return result.data ;
}
// ==========================.dat==================
// MAIN SHOW DASHBOARD FUNCTION WITH ROLE SUPPORT
// ============================================
async function showDashboard() {
    updateCopyrightYear();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block'; 
     
    let pre ;
    
    const user = await getCurrentUser();  
    const userSex = user.sex.toLowerCase() ; 
    userSex === 'male'? pre ='Mr.': pre = 'Mrs.' ; 
    const accountName = `${pre}${user.first_name} ` ;    
    
    // Update user info in UI
    document.getElementById('topUserName').textContent = accountName; 

    const accName = document.getElementById('topUserName') ; 
    accName.addEventListener('click' , ()=>{  
       switchSection('account');    
    })
    updateTopHeaderAvatar(currentUser.username);
    updateUserRoleBadge();    
    // Update UI based on role
    updateUIByRole();
    
    // Load data based on role
    await loadUserAssignedServices();
    await loadInvoices();
    await loadActivityLog();
    await loadSummary();  
    await loadAccountsForSelect();
    
    // Load role-specific data
    if (hasPermission.canManageAccounts()) {
        await loadAccounts();
    }
    
    if (hasPermission.canManageServices()) {
        await loadServicesList();
    }
    
    if (hasPermission.canViewUsersList()) {
        await loadUsers();
    }
    
    // Switch to dashboard section
    switchSection('dashboard');
}

// ============================================
// USER LOADING WITH ROLE-BASED FILTERING
// ============================================
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        
        if (result.success) {
            const container = document.getElementById('usersList');
            if (container) {
                let headerHtml = `
                    <div class="users-table-header">
                        <div class="header-user">👤 USER</div>
                        <div class="header-stats">📊 STATS</div>
                        <div class="header-badges">🏷️ ROLE & STATUS</div>
                        <div class="header-actions">⚡ ACTIONS</div>
                    </div>
                `;
                
                const rowsHtml = result.data.map((user, index) => {
                    let statusClass = 'active';
                    let statusText = 'Active';
                    let statusIcon = 'fa-circle';
                    if (user.status === 'suspended') {
                        statusClass = 'suspended';
                        statusText = 'Suspended';
                        statusIcon = 'fa-pause-circle';
                    } else if (user.status === 'blocked') {
                        statusClass = 'blocked';
                        statusText = 'Blocked';
                        statusIcon = 'fa-ban';
                    }
                    
                    let roleClass = 'user';
                    let roleIcon = getRoleIcon(user.role);
                    let roleDisplay = getRoleDisplayName(user.role);
                    
                    // Determine if current user can manage this user
                    let canManage = false;
                    if (currentUser.role === 'master') {
                        canManage = user.role !== 'master';
                    } else if (currentUser.role === 'admin') {
                        canManage = user.role === 'user' || user.role === 'user-admin';
                    } else if (currentUser.role === 'user-admin') {
                        canManage = user.role === 'user';
                    }
                    
                    return `
                        <div class="user-row-item" style="animation-delay: ${0.02 * (index % 10)}s">
                            <div class="user-info-section">
                                <div class="user-avatar-small">
                                    <div class="user-initials-row">${getUserInitials(user.username)}</div>
                                </div>
                                <div class="user-details-row">
                                    <div class="user-name-row">
                                        <strong>${escapeHtml(user.username)}</strong>
                                        <span class="user-account-row">
                                            <i class="fas fa-id-card"></i>
                                            ${escapeHtml(user.special_id ? user.special_id.substring(0, 8) : 'N/A')}
                                        </span>
                                    </div>
                                    <div class="user-account-row">
                                        <i class="fas fa-calendar-alt"></i>
                                        Joined: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="user-stats-section">
                                <div class="stat-chip">
                                    <i class="fas fa-stethoscope"></i>
                                    Services <strong>${user.assigned_services_count || 0}</strong>
                                </div>
                                <div class="stat-chip">
                                    <i class="fas fa-file-invoice"></i>
                                    Invoices <strong>${user.invoices_count || 0}</strong>
                                </div>
                            </div>
                            
                            <div class="user-badges-section">
                                <span class="role-badge-row ${roleClass}" style="background: ${getRoleColor(user.role)}; color: white;">
                                    <i class="fas ${roleIcon}"></i> ${roleDisplay}
                                </span>
                                <span class="status-badge-row ${statusClass}">
                                    <i class="fas ${statusIcon}"></i> ${statusText}
                                </span>
                            </div>
                            
                            <div class="user-actions-section">
                                ${canManage ? `
                                    ${hasPermission.canChangeUserPassword() ? `
                                        <button class="action-btn-row password" onclick="changeUserPassword('${user.special_id}')" title="Change Password">
                                            <i class="fas fa-key"></i>
                                        </button>
                                    ` : ''}
                                    ${user.status !== 'blocked' && hasPermission.canBlockUser() ? `
                                        <button class="action-btn-row block" onclick="toggleUserBlock('${user.special_id}')" title="Block User">
                                            <i class="fas fa-ban"></i>
                                        </button>
                                    ` : ''}
                                    ${user.status === 'blocked' && hasPermission.canBlockUser() ? `
                                        <button class="action-btn-row unblock" onclick="toggleUserBlock('${user.special_id}')" title="Unblock User">
                                            <i class="fas fa-check-circle"></i>
                                        </button>
                                    ` : ''}
                                    ${user.status !== 'suspended' && hasPermission.canSuspendUser() ? `
                                        <button class="action-btn-row suspend" onclick="suspendUser('${user.special_id}')" title="Suspend User">
                                            <i class="fas fa-pause-circle"></i>
                                        </button>
                                    ` : ''}
                                    ${user.status === 'suspended' && hasPermission.canSuspendUser() ? `
                                        <button class="action-btn-row unsuspend" onclick="unsuspendUser('${user.special_id}')" title="Unsuspend User">
                                            <i class="fas fa-play-circle"></i>
                                        </button>
                                    ` : ''}
                                    ${hasPermission.canDeleteUser() ? `
                                        <button class="action-btn-row delete" onclick="deleteUser('${user.special_id}')" title="Delete User">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    ` : ''}
                                ` : `
                                    <span class="readonly-badge-row">
                                        <i class="fas fa-lock"></i> View Only
                                    </span>
                                `}
                            </div>
                        </div>
                    `;
                }).join('');
                
                container.innerHTML = headerHtml + rowsHtml;
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showMessageModal('Error loading users', 'error');
    }
}

// ============================================
// ACTIVITY LOG WITH ROLE-BASED FILTERING
// ============================================
async function loadActivityLog() {
    try {
        const response = await fetch(`${API_BASE_URL}/activity-log`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        
        const container = document.getElementById('activityLogContainer');
        
        if (!container) {
            console.error('Container with id "activityLogContainer" not found!');
            return;
        }
        
        if (result.success && result.data) {
            let logsArray = result.data;
            
            if (Array.isArray(logsArray) && logsArray.length === 1 && Array.isArray(logsArray[0])) {
                logsArray = logsArray[0];
            }
            
            if (logsArray && logsArray.length > 0) {
                container.innerHTML = '';
                
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

// ============================================
// SUMMARY STATS WITH ROLE-BASED TOTALS
// ============================================
async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/summary`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        
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
            headers: getApiHeaders()
        });
        const result = await response.json();
        
        if (result.success) {
            const previewContainer = document.getElementById('recentActivityPreview');
            if (previewContainer) {
                let logsArray = result.data;
                if (Array.isArray(logsArray) && logsArray.length === 1 && Array.isArray(logsArray[0])) {
                    logsArray = logsArray[0];
                }
                previewContainer.innerHTML = (logsArray || []).slice(0, 5).map(log => `
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

// ============================================
// USER ASSIGNED SERVICES
// ============================================
async function loadUserAssignedServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/my-services`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        
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
    
    const checkboxes = container.querySelectorAll('input[name="service"]');
    checkboxes.forEach(checkbox => {
        checkbox.removeEventListener('change', handleServiceSelection);
        checkbox.addEventListener('change', handleServiceSelection);
    });
}

function handleServiceSelection(event) {
    const clickedCheckbox = event.target;
    const allCheckboxes = document.querySelectorAll('input[name="service"]');
    
    if (clickedCheckbox.checked) {
        allCheckboxes.forEach(checkbox => {
            if (checkbox !== clickedCheckbox) {
                checkbox.disabled = true;
                checkbox.parentElement.style.opacity = '0.6';
                checkbox.parentElement.style.cursor = 'not-allowed';
            } else {
                checkbox.parentElement.style.opacity = '1';
                checkbox.parentElement.style.cursor = 'pointer';
            }
        });
    } else {
        allCheckboxes.forEach(checkbox => {
            checkbox.disabled = false;
            checkbox.parentElement.style.opacity = '1';
            checkbox.parentElement.style.cursor = 'pointer';
        });
    }
}

// ============================================
// INVOICE FUNCTIONS
// ============================================
async function loadInvoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        
        if (result.success) { 
            allInvoices = result.data;
            
            allInvoices.forEach(inv => {
                if (inv.account_type === null || inv.account_type === undefined) {
                    if (inv.account_name === 'Drugs Account') {
                        inv.account_type = 'drugs';
                    } else if (inv.account_name === 'Non-Drugs Account') {
                        inv.account_type = 'nondrugs';
                    } else {
                        inv.account_type = 'nondrugs';
                    }
                }
                
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
            
            buildUniqueServicesList();
            
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
}

function initializeInvoiceView() {
    const standardViewBtn = document.getElementById('standardViewBtn');
    const serviceColumnsViewBtn = document.getElementById('serviceColumnsViewBtn');
    const standardViewContainer = document.getElementById('standardViewContainer');
    const serviceColumnsViewContainer = document.getElementById('serviceColumnsViewContainer');
    
    if (currentInvoiceView === 'serviceColumns') {
        if (standardViewBtn) standardViewBtn.classList.remove('active');
        if (serviceColumnsViewBtn) serviceColumnsViewBtn.classList.add('active');
        if (standardViewContainer) standardViewContainer.style.display = 'none';
        if (serviceColumnsViewContainer) serviceColumnsViewContainer.style.display = 'block';
        renderServiceColumnsView(allInvoices);
    } else {
        if (standardViewBtn) standardViewBtn.classList.add('active');
        if (serviceColumnsViewBtn) serviceColumnsViewBtn.classList.remove('active');
        if (standardViewContainer) standardViewContainer.style.display = 'block';
        if (serviceColumnsViewContainer) serviceColumnsViewContainer.style.display = 'none';
        renderInvoicesTable(allInvoices);
    }
}

function renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    const footer = document.getElementById('tableFooter');
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No records found</td></tr>';
        if (footer) footer.style.display = 'none';
        return;
    }
    
    tbody.innerHTML = invoices.map(inv => {
        const invoiceAmount = (inv.price !== null && inv.price !== undefined) ? inv.price : 0;
        const canEdit = hasPermission.canEditInvoice();
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
                ${canEdit ? `
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
    
    const grandTotal = invoices.reduce((sum, inv) => sum + ((inv.price !== null && inv.price !== undefined) ? inv.price : 0), 0);
    const grandTotalElement = document.getElementById('filteredGrandTotal');
    if (grandTotalElement) {
        grandTotalElement.innerHTML = `<strong>GH¢${grandTotal.toFixed(2)}</strong>`;
    }
    if (footer) footer.style.display = 'table-footer-group';
}

function renderServiceColumnsView(invoices, page = 1, pageSize = 100) {
    const thead = document.getElementById('serviceColumnsHeader');
    const tbody = document.getElementById('serviceColumnsBody');
    const footer = document.getElementById('serviceColumnsFooter');
    const recordCountSpan = document.getElementById('serviceColumnsRecordCount');
    const grandTotalSpan = document.getElementById('serviceColumnsGrandTotal');
    
    serviceColumnsFilteredData = invoices;
    
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
        updatePaginationUI(0, 0, 0, 0);
        return;
    }
    
    const serviceTotals = new Map();
    allUniqueServices.forEach(service => serviceTotals.set(service.name, 0));
    
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
    
    let headersHtml = `
        <tr>
            <th class="fixed-col-date">Date & Time</th>
            <th class="fixed-col-name">Name</th>
            <th class="fixed-col-gcr">#GCR</th>
            <th class="fixed-col-account" style="width:100px">Account</th>
    `;
    
    allUniqueServices.forEach(service => {
        headersHtml += `<th>${escapeHtml(service.name)}</th>`;
    });
    
    headersHtml += `
            <th class="fixed-col-amount">Amount (GH¢)</th>
            <th class="fixed-col-actions">Actions</th>
        </tr>
    `;
    thead.innerHTML = headersHtml;
    
    let bodyHtml = '';
    const canEdit = hasPermission.canEditInvoice();
    
    paginatedInvoices.forEach(invoice => {
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
        
        bodyHtml += `
            <tr>
                <td class="fixed-col-date">${new Date(invoice.timestamp).toLocaleString()}</td>
                <td class="fixed-col-name"><strong>${escapeHtml(invoice.patient_name)}</strong></td>
                <td class="fixed-col-gcr">${invoice.gcr_number}</td>
                <td class="fixed-col-account">
                    <span class="badge" style="background:${invoice.account_type === 'drugs' ? '#10b981' : '#f59e0b'}">
                        ${invoice.account_type === 'drugs' ? 'Drug' : 'Non-Drug'}
                    </span>
                </td>
        `;
        
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
        
        const invoiceAmount = (invoice.price !== null && invoice.price !== undefined) ? invoice.price : 0;
        bodyHtml += `
                <td class="fixed-col-amount"><strong>GH¢${invoiceAmount.toFixed(2)}</strong></td>
                <td class="fixed-col-actions">
                    ${canEdit ? `
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
    
    bodyHtml += `
        <tr class="subtotal-row" style="background: #eef2ff; font-weight: bold;">
            <td colspan="4" style="text-align: right; font-weight: bold; background: #eef2ff;">
                <strong>SERVICE SUBTOTALS:</strong>
            </td>
    `;
    
    allUniqueServices.forEach(service => {
        const subtotal = serviceTotals.get(service.name) || 0;
        bodyHtml += `<td style="text-align: center; font-weight: bold; color: var(--blue-600); background: #eef2ff;">GH¢${subtotal.toFixed(2)}</td>`;
    });
    
    bodyHtml += `<td style="background: #eef2ff;"></td><td style="background: #eef2ff;"></td></tr>`;
    
    const grandTotal = invoices.reduce((sum, inv) => sum + (inv.price || 0), 0);
    bodyHtml += `
        <tr class="grand-total-row" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1)); font-weight: bold;">
            <td colspan="4" style="text-align: right; font-weight: bold; font-size: 14px;">
                <strong>GRAND TOTAL:</strong>
            </td>
    `;
    
    allUniqueServices.forEach(() => { bodyHtml += `<td style="background: transparent;"></td>`; });
    bodyHtml += `<td style="font-weight: bold; font-size: 16px; color: var(--blue-700);"><strong>GH¢${grandTotal.toFixed(2)}</strong></td><td style="background: transparent;"></td></tr>`;
    
    tbody.innerHTML = bodyHtml;
    
    if (footer) footer.style.display = 'none';
    if (recordCountSpan) recordCountSpan.textContent = `${totalRecords} records`;
    if (grandTotalSpan) grandTotalSpan.textContent = `GH¢${grandTotal.toFixed(2)}`;
    
    updatePaginationUI(totalRecords, totalPages, page, pageSize);
    updatePaginationRangeDisplay(startIndex + 1, endIndex, totalRecords);
}

function updatePaginationUI(totalRecords, totalPages, currentPage, pageSize) {
    const currentPageSpan = document.getElementById('serviceColumnsCurrentPage');
    const totalPagesSpan = document.getElementById('serviceColumnsTotalPages');
    const firstPageBtn = document.getElementById('serviceColumnsFirstPage');
    const prevPageBtn = document.getElementById('serviceColumnsPrevPage');
    const nextPageBtn = document.getElementById('serviceColumnsNextPage');
    const lastPageBtn = document.getElementById('serviceColumnsLastPage');
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages || 1;
    
    if (firstPageBtn) firstPageBtn.disabled = (currentPage === 1);
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    if (lastPageBtn) lastPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    
    [firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn].forEach(btn => {
        if (btn) {
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
        }
    });
}

function updatePaginationRangeDisplay(start, end, total) {
    const startSpan = document.getElementById('serviceColumnsStartRange');
    const endSpan = document.getElementById('serviceColumnsEndRange');
    const totalSpan = document.getElementById('serviceColumnsTotalRecords');
    
    if (startSpan) startSpan.textContent = start;
    if (endSpan) endSpan.textContent = end;
    if (totalSpan) totalSpan.textContent = total;
}

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

function getFilteredInvoicesForServiceColumns() {
    const accountType = document.getElementById('filterAccountType')?.value || 'all';
    const serviceName = document.getElementById('filterService')?.value || 'all';
    const searchTerm = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const dateFrom = currentDateRange?.from || null;
    const dateTo = currentDateRange?.to || null;
    
    let filtered = [...allInvoices];
    
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
                return inv.services.some(s => (s.service_name || s.name) === serviceName);
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

function setupFilterEventListeners() {
    const accountTypeFilter = document.getElementById('filterAccountType');
    const serviceFilter = document.getElementById('filterService');
    const searchFilter = document.getElementById('filterSearch');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const applyDateFilterBtn = document.getElementById('applyDateFilterBtn');
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    
    if (accountTypeFilter) accountTypeFilter.addEventListener('change', filterInvoices);
    if (serviceFilter) serviceFilter.addEventListener('change', filterInvoices);
    if (searchFilter) searchFilter.addEventListener('input', filterInvoices);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (applyDateFilterBtn) applyDateFilterBtn.addEventListener('click', applyDateRangeFilter);
    if (filterDateFrom) filterDateFrom.addEventListener('change', applyDateRangeFilter);
    if (filterDateTo) filterDateTo.addEventListener('change', applyDateRangeFilter);
}

function applyDateRangeFilter() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    currentDateRange.from = dateFrom;
    currentDateRange.to = dateTo;
    filterInvoices();
}

function filterInvoices() {
    const accountType = document.getElementById('filterAccountType').value;
    const serviceName = document.getElementById('filterService').value;
    const searchTerm = document.getElementById('filterSearch').value.toLowerCase().trim();
    const dateFrom = currentDateRange.from;
    const dateTo = currentDateRange.to;
    
    let filtered = [...allInvoices];
    
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
    
    if (accountType !== 'all') filtered = filtered.filter(inv => inv.account_name === accountType);
    if (serviceName !== 'all') {
        filtered = filtered.filter(inv => inv.services?.some(s => s.service_name === serviceName));
    }
    if (searchTerm) {
        filtered = filtered.filter(inv => 
            inv.patient_name.toLowerCase().includes(searchTerm) ||
            inv.gcr_number.includes(searchTerm)
        );
    }
    
    if (currentInvoiceView === 'standard') {
        renderInvoicesTable(filtered);
    } else {
        buildUniqueServicesListForFiltered(filtered);
        renderServiceColumnsView(filtered);
    }
    
    updateFilteredCount(filtered.length);
    updateFilteredGrandTotal(filtered);
    updateDateRangeDisplay(filtered.length);
}

function buildUniqueServicesListForFiltered(invoices) {
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
    allUniqueServices = Array.from(serviceMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function clearFilters() {
    document.getElementById('filterAccountType').value = 'all';
    document.getElementById('filterService').value = 'all';
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    currentDateRange.from = null;
    currentDateRange.to = null;
    
    if (currentInvoiceView === 'standard') {
        renderInvoicesTable(allInvoices);
    } else {
        buildUniqueServicesList();
        renderServiceColumnsView(allInvoices);
    }
    
    updateFilteredCount(allInvoices.length);
    updateFilteredGrandTotal(allInvoices);
    updateDateRangeDisplay(allInvoices.length);
}

function updateFilteredGrandTotal(filteredInvoices) {
    const grandTotal = filteredInvoices.reduce((sum, inv) => sum + ((inv.price !== null && inv.price !== undefined) ? inv.price : 0), 0);
    const standardGrandTotal = document.getElementById('filteredGrandTotal');
    if (standardGrandTotal) standardGrandTotal.innerHTML = `<strong>GH¢${grandTotal.toFixed(2)}</strong>`;
    const serviceColumnsGrandTotal = document.getElementById('serviceColumnsGrandTotal');
    if (serviceColumnsGrandTotal) serviceColumnsGrandTotal.innerHTML = `<strong>GH¢${grandTotal.toFixed(2)}</strong>`;
}

function updateDateRangeDisplay(count) {
    const filterStats = document.getElementById('filterStats');
    const dateFrom = currentDateRange.from;
    const dateTo = currentDateRange.to;
    
    if (filterStats && (dateFrom || dateTo)) {
        let dateRangeText = '';
        if (dateFrom && dateTo) dateRangeText = ` | Date Range: ${formatDate(dateFrom)} to ${formatDate(dateTo)}`;
        else if (dateFrom) dateRangeText = ` | From: ${formatDate(dateFrom)}`;
        else if (dateTo) dateRangeText = ` | To: ${formatDate(dateTo)}`;
        
        const existingHtml = filterStats.innerHTML;
        const cleanedHtml = existingHtml.replace(/ \| Date Range:.*$/, '');
        filterStats.innerHTML = cleanedHtml + dateRangeText;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
}

function getFilteredInvoices() {
    const accountType = document.getElementById('filterAccountType')?.value || 'all';
    const serviceName = document.getElementById('filterService')?.value || 'all';
    const searchTerm = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const dateFrom = currentDateRange?.from || null;
    const dateTo = currentDateRange?.to || null;
    
    let filtered = [...allInvoices];
    
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
    
    if (accountType !== 'all') filtered = filtered.filter(inv => inv.account_name === accountType);
    if (serviceName !== 'all') {
        filtered = filtered.filter(inv => inv.services?.some(s => s.service_name === serviceName));
    }
    if (searchTerm) {
        filtered = filtered.filter(inv => 
            inv.patient_name.toLowerCase().includes(searchTerm) ||
            inv.gcr_number.includes(searchTerm)
        );
    }
    
    return filtered;
}

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
        const filtered = getFilteredInvoices();
        renderInvoicesTable(filtered);
        updateFilteredCount(filtered.length);
        updateFilteredGrandTotal(filtered);
    } else {
        standardViewBtn.classList.remove('active');
        serviceColumnsViewBtn.classList.add('active');
        standardViewContainer.style.display = 'none';
        serviceColumnsViewContainer.style.display = 'block';
        const filtered = getFilteredInvoices();
        buildUniqueServicesListForFiltered(filtered);
        renderServiceColumnsView(filtered);
        updateFilteredCount(filtered.length);
        updateFilteredGrandTotal(filtered);
    }
}

async function toggleFilterCollapse() {
    const filterContent = document.getElementById('filterContent');
    const toggleIcon = document.getElementById('filterToggleIcon');
    if (!filterContent || !toggleIcon) return;
    
    isFilterCollapsed = !isFilterCollapsed;
    
    if (isFilterCollapsed) {
        filterContent.classList.add('collapsed');
        toggleIcon.classList.add('collapsed');
        localStorage.setItem('filterCollapsed', 'true');
    } else {
        filterContent.classList.remove('collapsed');
        toggleIcon.classList.remove('collapsed');
        localStorage.setItem('filterCollapsed', 'false');
    }
}

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

// ============================================
// HELPER FUNCTIONS
// ============================================
function onlyNumbers(event) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode === 8 || charCode === 46 || charCode === 9 || charCode === 27 || charCode === 13) return true;
    if (charCode >= 48 && charCode <= 57) return true;
    event.preventDefault();
    return false;
}

function onlyNumbersAndDecimal(event) {
    const charCode = event.which ? event.which : event.keyCode;
    const char = String.fromCharCode(charCode);
    if (charCode === 8 || charCode === 46 || charCode === 9 || charCode === 27 || charCode === 13) return true;
    if ((charCode >= 48 && charCode <= 57) || char === '.') {
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

// Format phone number to 024-293-1112
function formatPhoneNumber(value) {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length >= 7) {
        return cleaned.slice(0, 3) + '-' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10);
    } else if (cleaned.length >= 4) {
        return cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    } else {
        return cleaned;
    }
}

// validate phone input to only allow numbers and 10digits  
function phoneNumberValidate(inputId){ 
    const phoneNumber = document.getElementById(`${inputId}`);
    
    phoneNumber.addEventListener('input', function() {
        // Format the input
        this.value = formatPhoneNumber(this.value);
        
        // Get raw digits
        const rawDigits = this.value.replace(/\D/g, '');
        this.dataset.rawDigits = rawDigits;
        
        // Validate
        const isValid = rawDigits.length === 10;
        this.style.borderColor = isValid ? 'green' : 'red';
        
        // Show message
        const messageEl = document.getElementById(`${inputId}-message`);
        if (messageEl) {
            if (rawDigits.length === 0) {
                messageEl.textContent = '';
            } else if (isValid) {
                messageEl.textContent = '✓ Valid';
                messageEl.style.color = 'green';
            } else {
                messageEl.textContent = `${rawDigits.length}/10 digits`;
                messageEl.style.color = 'red';
            }
        }
    });
}

phoneNumberValidate('modalNewPhone') ;  
phoneNumberValidate('editPhoneNumber');

 




function validateGCRNumber(input) {
    input.value = input.value.replace(/[^\d]/g, '');
    if (input.value.length > 8) input.value = input.value.slice(0, 8);
    if (input.value.length === 8) input.style.borderColor = '#10b981';
    else if (input.value.length > 0) input.style.borderColor = '#f59e0b';
    else input.style.borderColor = '';
}

function validateAmount(input) {
    let value = input.value;
    value = value.replace(/[^\d.]/g, '');
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const lastDecimalIndex = value.lastIndexOf('.');
        value = value.substring(0, lastDecimalIndex) + value.substring(lastDecimalIndex + 1);
    }
    if (value.includes('.')) {
        const parts = value.split('.');
        if (parts[1] && parts[1].length > 2) value = parts[0] + '.' + parts[1].slice(0, 2);
    }
    input.value = value;
    if (value && parseFloat(value) > 0) input.style.borderColor = '#10b981';
    else if (value) input.style.borderColor = '#f59e0b';
    else input.style.borderColor = '';
}

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
            <span class="service-price-readonly">GH¢${service.price.toFixed(2)}</span>
        </div>
    `).join('');
}

// ============================================
// ACCOUNT MANAGEMENT FUNCTIONS
// ============================================

async function loadAccounts() {
    if (!hasPermission.canManageAccounts()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, { 
            headers: getApiHeaders() 
        });
        const result = await response.json();
        
        if (result.success) {
            accounts = result.data;
            
            // Update stats
            updateAccountStats(accounts);
            
            // Render accounts
            renderAccountsGrid(accounts);
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        showMessageModal('Error loading accounts', 'error');
    }
}

// Update account statistics
function updateAccountStats(accounts) {
    const totalCount = accounts.length;
    const drugsCount = accounts.filter(a => a.account_type === 'drugs').length;
    const nonDrugsCount = accounts.filter(a => a.account_type === 'nondrugs').length;
    const activeCount = accounts.filter(a => a.status !== 'inactive').length;
    
    document.getElementById('totalAccountsCount').textContent = totalCount;
    document.getElementById('drugsAccountsCount').textContent = drugsCount;
    document.getElementById('nonDrugsAccountsCount').textContent = nonDrugsCount;
    document.getElementById('activeAccountsCount').textContent = activeCount;
}

// Render accounts in modern grid
function renderAccountsGrid(accountsToRender) {
    const container = document.getElementById('accountsList');
    const emptyState = document.getElementById('accountsEmptyState');
    
    if (!container) return;
    
    if (accountsToRender.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = accountsToRender.map((account, index) => {
        const isDrugs = account.account_type === 'drugs';
        const typeLabel = isDrugs ? 'Drugs Account' : 'Non-Drugs Account';
        const typeClass = isDrugs ? 'drugs' : 'nondrugs';
        
        return `
            <div class="account-card-modern" style="animation-delay: ${0.02 * (index % 10)}s">
                <div class="account-card-header">
                    <div class="account-icon ${typeClass}">
                        <i class="fas ${isDrugs ? 'fa-pills' : 'fa-notes-medical'}"></i>
                    </div>
                    <div class="account-title">
                        <div class="account-name-modern">
                            ${escapeHtml(account.account_name)}
                        </div>
                        <span class="account-type-badge ${typeClass}">
                            <i class="fas ${isDrugs ? 'fa-pills' : 'fa-chart-line'}"></i>
                            ${typeLabel}
                        </span>
                    </div>
                </div>
                <div class="account-card-body">
                    <div class="account-description-modern">
                        ${account.description ? escapeHtml(account.description) : ''}
                    </div>
                    <div class="account-meta">
                        <div class="account-stats">
                            <div class="account-stat-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Created: ${account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                        <div class="account-actions-modern">
                            <button class="action-icon-account edit" onclick="editAccount(${account.id})" title="Edit Account">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-icon-account delete" onclick="deleteAccount(${account.id})" title="Delete Account">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Setup account filters
function setupAccountFilters() {
    const searchInput = document.getElementById('accountSearchInput');
    const clearBtn = document.getElementById('clearAccountSearch');
    const filterChips = document.querySelectorAll('.filter-chip');
    let currentFilter = 'all';
    let searchTerm = '';
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            if (clearBtn) clearBtn.style.display = searchTerm ? 'flex' : 'none';
            filterAccounts(currentFilter, searchTerm);
        });
    }
    
    // Clear search
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchTerm = '';
                clearBtn.style.display = 'none';
                filterAccounts(currentFilter, searchTerm);
            }
        });
    }
    
    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            filterAccounts(currentFilter, searchTerm);
        });
    });
}

// Filter accounts
function filterAccounts(filter, searchTerm) {
    let filtered = [...accounts];
    
    // Apply filter
    if (filter === 'drugs') {
        filtered = filtered.filter(a => a.account_type === 'drugs');
    } else if (filter === 'nondrugs') {
        filtered = filtered.filter(a => a.account_type === 'nondrugs');
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.account_name.toLowerCase().includes(searchTerm) ||
            (a.description && a.description.toLowerCase().includes(searchTerm))
        );
    }
    
    renderAccountsGrid(filtered);
}

async function loadAccountsForSelect() {
    if (!hasPermission.canManageAccounts()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, { headers: getApiHeaders() });
        const result = await response.json();
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

async function loadAccountsForEditSelect(selectedAccountId) {
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, { headers: getApiHeaders() });
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

// ============================================
// SERVICE MANAGEMENT FUNCTIONS
// ============================================

async function loadServicesList() {
    if (!hasPermission.canManageServices()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/services`, { 
            headers: getApiHeaders() 
        });
        const result = await response.json();
        
        if (result.success) {
            services = result.data; 

            // console.log('Loaded services:', services);
            
            // Update stats
            updateServicesStats(services);
            
            // Store for filtering
            allServicesList = services;
            
            // Render the modern grid
            renderServicesGrid(services);
        }
    } catch (error) {
        console.error('Error loading services:', error);
        showMessageModal('Error loading services', 'error');
    }
}   



function updateServicesStats(services) {
    const totalCount = services.length; 
    const withPrice = services.filter(s => s.prices && s.prices.length > 0);

    // console.log('Services with price:', withPrice);



    const prices = withPrice.map(s => s.prices[s.prices.length - 1].price); // Get the latest price for each service    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    
    document.getElementById('totalServicesCount').textContent = totalCount;
    document.getElementById('priceRange').textContent = prices.length > 0 ? `GH¢${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}` : 'GH¢0 - 0';
    document.getElementById('avgPrice').textContent = `GH¢${avgPrice.toFixed(2)}`;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString();
}  


function renderServicesGrid(servicesToRender) {
    const container = document.getElementById('servicesList');
    const emptyState = document.getElementById('servicesEmptyState');
    
    if (!container) return;
    
    if (servicesToRender.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = servicesToRender.map((service, index) => {
        const hasPrice = service.price && service.price > 0;
        const priceDisplay = hasPrice ? `GH¢${service.price.toFixed(2)}` : 'Price Pending';
        const priceClass = hasPrice ? 'has-price' : 'no-price';
        
        return `
            <div class="service-card-modern" style="animation-delay: ${0.02 * (index % 10)}s">
                <div class="service-card-header">
                    <div class="service-icon">
                        <i class="fas fa-stethoscope"></i>
                    </div>
                    <div class="service-title">
                        <div class="service-name-modern">
                            ${escapeHtml(service.service_name)}
                            <span class="price-badge ${priceClass}">
                                <i class="fas ${hasPrice ? 'fa-check-circle' : 'fa-clock'}"></i>
                                ${hasPrice ? 'Priced' : 'Pending'}
                            </span>
                        </div>
                        <div class="service-category">
                            <i class="fas fa-folder"></i>
                            <span>Healthcare Service</span>
                        </div>
                    </div>
                </div>
                <div class="service-card-body">
                    <div class="service-description-modern">
                        ${service.description ? escapeHtml(service.description) : ''}
                    </div>
                    <div class="service-meta">
                        <div class="price-container">
                            <span class="price-currency">GH¢</span>
                            <span class="price-amount ${!hasPrice ? 'pending' : ''}">${hasPrice ? service.price.toFixed(2) : '—'}</span>
                        </div>
                        <div class="service-actions-modern">
                            <button class="action-icon-modern edit" onclick="editService(${service.id})" title="Edit Service">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-icon-modern delete" onclick="deleteService(${service.id})" title="Delete Service">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Setup search and filter for services
function setupServiceFilters() {
    const searchInput = document.getElementById('serviceSearchInput');
    const clearBtn = document.getElementById('clearServiceSearch');
    const filterTabs = document.querySelectorAll('.filter-tab');
    let currentFilter = 'all';
    let searchTerm = '';
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            if (clearBtn) clearBtn.style.display = searchTerm ? 'flex' : 'none';
            filterServices(currentFilter, searchTerm);
        });
    }
    
    // Clear search
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchTerm = '';
                clearBtn.style.display = 'none';
                filterServices(currentFilter, searchTerm);
            }
        });
    }
    
    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            filterServices(currentFilter, searchTerm);
        });
    });
}

// Filter services
function filterServices(filter, searchTerm) {
    let filtered = [...services];
    
    // Apply filter
    if (filter === 'has-price') {
        filtered = filtered.filter(s => s.price && s.price > 0);
    } else if (filter === 'no-price') {
        filtered = filtered.filter(s => !s.price || s.price === 0);
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.service_name.toLowerCase().includes(searchTerm) ||
            (s.description && s.description.toLowerCase().includes(searchTerm))
        );
    }
    
    renderServicesGrid(filtered);
}

// Update the editService function to use the dedicated EditServiceModal
window.editService = async function(id) {
    const service = services.find(s => s.id === id);
    if (!service) {
        showMessageModal('Service not found', 'error');
        return;
    }
    
    // Populate edit modal
    document.getElementById('modalServiceName').value = service.service_name;
    document.getElementById('modalServiceDescription').value = service.description || '';
    document.getElementById('modalServicePrice').value = service.price || '';
    
    // Store service ID for update
    document.getElementById('editServiceForm').dataset.serviceId = id;
    
    showModal('EditServiceModal');
};

// Update the editService form submission handler
document.getElementById('editServiceForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = this.dataset.serviceId;
    await updateService(id);
});

// Update updateService function to close correct modal
async function updateService(id) {
    const serviceName = document.getElementById('modalServiceName').value.trim();
    const description = document.getElementById('modalServiceDescription').value.trim();
    const price = document.getElementById('modalServicePrice').value.trim();
    
    if (!serviceName) {
        showMessageModal('Please enter service name', 'warning');
        return;
    }
    
    const serviceData = { serviceName, description, updatedBy: currentUser.username };
    if (price) {
        const priceNum = parseFloat(price);
        if (!isNaN(priceNum) && priceNum > 0) serviceData.price = priceNum;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/services/${id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify(serviceData)
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Service updated successfully!', 'success');
            closeModal('EditServiceModal');
            document.getElementById('editServiceForm').reset();
            loadServicesList();
            loadAllServicesForAssignment();
            logActivity(`Updated service: ${serviceName}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating service:', error);
        showMessageModal('Error updating service', 'error');
    }
}

// Update editAccount function
window.editAccount = async function(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) {
        showMessageModal('Account not found', 'error');
        return;
    } 


    showModal('EditAccountModal');
    
    // Populate edit modal
    document.getElementById('editAccountId').value = account.id;
    document.getElementById('editModalAccountName').value = account.account_name;
    document.getElementById('editModalAccountDescription').value = account.description || '';
    document.getElementById('editModalAccountTypeSelect').value = account.account_type;
    
    
};

// Add editAccount form submission handler
document.getElementById('editAccountForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('editAccountId').value;
    await updateAccount(id);
});

// Update updateAccount function to close correct modal
async function updateAccount(id) {
    const accountName = document.getElementById('editModalAccountName').value.trim();
    const accountType = document.getElementById('editModalAccountTypeSelect').value;
    const description = document.getElementById('editModalAccountDescription').value.trim();
    
    if (!accountName) {
        showMessageModal('Please enter account name', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ 
                accountName, 
                accountType, 
                description,
                updatedBy: currentUser.username 
            })
        });
        const result = await response.json();

        console.log('Edit account results:' , result)
        if (result.success) {
            showMessageModal('Account updated successfully!', 'success');
            closeModal('EditAccountModal');
            document.getElementById('editAccountForm').reset();
            loadAccounts();
            loadAccountsForSelect();
            logActivity(`Updated account: ${accountName}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating account:', error);
        showMessageModal('Error updating account', 'error');
    }
}

// Update service function
async function updateService(id) {
    const serviceName = document.getElementById('modalServiceName').value.trim();
    const description = document.getElementById('modalServiceDescription').value.trim();
    const price = document.getElementById('modalServicePrice').value.trim();
    
    if (!serviceName) {
        showMessageModal('Please enter service name', 'warning');
        return;
    }
    
    const serviceData = { serviceName, description, updatedBy: currentUser.username };
    if (price) {
        const priceNum = parseFloat(price);
        if (!isNaN(priceNum) && priceNum > 0) serviceData.price = priceNum;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/services/${id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify(serviceData)
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Service updated successfully!', 'success');
            closeModal('addServiceModal');
            document.getElementById('addServiceForm').reset();
            loadServicesList();
            logActivity(`Updated service: ${serviceName}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating service:', error);
        showMessageModal('Error updating service', 'error');
    }
}
async function loadServicesForFilter() {
    try {
        const response = await fetch(`${API_BASE_URL}/my-services`, { headers: getApiHeaders() });
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

async function loadServicesForUserSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            const select = document.getElementById('modalUserServicesListSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Select Service (Optional) --</option>' + 
                    result.data.map(service => `<option value="${service.id}">${escapeHtml(service.service_name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading services for user select:', error);
    }
}

// =======================================================================//////  
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======//////
// =======================  NEW USER ASSIGNMENT FUNCTION FOR POPUP =======////// 
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================//////
// =======================================================================////// 
 



// Load all available services
async function loadAllServicesForAssignment() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        if (result.success) {
            allServicesList = result.data;
            renderAvailableServices();
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}  


// load all avilable assignments 


// // Optional: Add "Select All" checkbox
function addSelectAllCheckbox(container) {
    const selectAllContainer = document.createElement('div');
    selectAllContainer.className = 'service-checkbox-item select-all';
    
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'selectAllServices';
    selectAllCheckbox.className = 'service-checkbox';
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = container.querySelectorAll('.service-checkbox:not(#selectAllServices)');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
    
    const selectAllLabel = document.createElement('label');
    selectAllLabel.htmlFor = 'selectAllServices';
    selectAllLabel.className = 'service-checkbox-label select-all-label';
    selectAllLabel.innerHTML = '<i class="fas fa-check-double"></i> Select All';
    
    selectAllContainer.appendChild(selectAllCheckbox);
    selectAllContainer.appendChild(selectAllLabel);
    
    // Insert at the beginning
    container.insertBefore(selectAllContainer, container.firstChild);
}

// // Function to get selected service IDs from checkboxes
function getSelectedServices() {
    const checkboxes = document.querySelectorAll('#servicesAssignAddUser .service-checkbox:checked');
    const selectedIds = [];
    checkboxes.forEach(cb => {
        if (cb.id !== 'selectAllServices') {
            selectedIds.push(parseInt(cb.value));
        }
    });
    return selectedIds;
} 
 




// Function to update selected services count
function updateServicesCount() {
    const selected = getSelectedServices();
    const countDisplay = document.getElementById('servicesSelectedCount');
    if (countDisplay) {
        countDisplay.textContent = `${selected.length} selected`;
    }
}

// Call this after loading services
// Add event listeners to checkboxes
function attachServiceCheckboxListeners() {
    const checkboxes = document.querySelectorAll('#servicesAssignAddUser .service-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateServicesCount);
    });
}

// Update loadAssignmentToAddUserModal to include this
async function loadAssignmentToAddUserModal() {    
    const displayServices = document.getElementById('servicesAssignAddUser');
    
    try {   
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: getApiHeaders()
        });
        const result = await response.json();  

        console.log('services in add user return' , result)
        
        if (result.success) {
            displayServices.innerHTML = '';
            
            result.data.forEach(service => {
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'service-checkbox-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `service_${service.id}`;
                checkbox.value = service.id;
                checkbox.className = 'service-checkbox';
                
                const label = document.createElement('label');
                label.htmlFor = `service_${service.id}`;
                label.className = 'service-checkbox-label';
                label.innerHTML = `<i class="fas fa-stethoscope"></i> ${service.service_name}`;
                
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                displayServices.appendChild(checkboxContainer);
            });
            
            addSelectAllCheckbox(displayServices);
            attachServiceCheckboxListeners();
            updateServicesCount();
        }
    } catch(error) {
        console.error('Error loading Assignment to add user modal', error);
        displayServices.innerHTML = '<span class="error-text">Failed to load services</span>';
    }
}


// Load users for service assignment - Make sure this is the only version
async function loadUsersForServiceAssignment() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        
        if (result.success) {
            allUsersList = result.data;
            
            // Fetch full service objects for each user (not just IDs)
            for (let i = 0; i < allUsersList.length; i++) {
                const user = allUsersList[i];
                if (user.role === 'user' || user.role === 'user-admin') {
                    try {
                        const servicesResponse = await fetch(`${API_BASE_URL}/users/${user.id}/services`, {
                            headers: getApiHeaders()
                        });
                        const servicesResult = await servicesResponse.json();
                        if (servicesResult.success) {
                            // Store the full service objects
                            user.services = servicesResult.data || [];
                        } else {
                            user.services = [];
                        }
                    } catch (err) {
                        console.error(`Error fetching services for user ${user.id}:`, err);
                        user.services = [];
                    }
                } else {
                    user.services = [];
                }
            }
            
            updateUserCountBadge();
            renderUsersTable(allUsersList);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('usersServicesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error loading users</td></tr>';
        }
    }
}



 

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
            headers: getApiHeaders(),
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


async function loadUserServices() {
    const userId = document.getElementById('userSelectForServices').value;
    const userServiceManagement = document.getElementById('userServiceManagement');
    if (!userId) {
        if (userServiceManagement) userServiceManagement.style.display = 'none';
        return;
    }
    if (userServiceManagement) userServiceManagement.style.display = 'block';
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/services`, { headers: getApiHeaders() });
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
                                <small>GH¢${service.price || 0}</small>
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

async function removeUserService(userId, serviceId) {
    showConfirmModal('Remove this service from the user?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/services/${serviceId}`, {
                method: 'DELETE',
                headers: getApiHeaders(),
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
} 

// Update user count badge
function updateUserCountBadge() {
    const badge = document.getElementById('userCountBadge');
    if (badge) {
        const count = allUsersList.filter(u => u.role === 'user' || u.role === 'user-admin').length;
        badge.textContent = `${count} Users`;
    }
} 

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return name.substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Close service assignment modal
function closeServiceAssignmentModal() {
    closeModal('serviceAssignmentModal');
    selectedUserIdForServices = null;
    availableServicesFilter = '';
    assignedServicesFilter = '';
    
    // Clear search inputs
    const availableSearch = document.getElementById('availableServicesSearch');
    const assignedSearch = document.getElementById('assignedServicesSearch');
    if (availableSearch) availableSearch.value = '';
    if (assignedSearch) assignedSearch.value = '';
    
    // Refresh users table to show updated service counts
    renderUsersTable(allUsersList);
}

// Load all available services for modal
async function loadAllServicesForAssignmentModal() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        if (result.success) {
            allServicesList = result.data;
            renderAvailableServicesModal();
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}  

// Render available services with checkboxes
function renderAvailableServices() {
    const container = document.getElementById('availableServicesList');
    if (!container) return;
    
    const assignedServiceIds = new Set(userAssignedServicesList.map(s => s.id));
    let filteredServices = allServicesList.filter(s => !assignedServiceIds.has(s.id));
    
    // Apply search filter
    if (availableServicesFilter) {
        filteredServices = filteredServices.filter(s => 
            s.service_name.toLowerCase().includes(availableServicesFilter) ||
            (s.description && s.description.toLowerCase().includes(availableServicesFilter))
        );
    }
    
    if (filteredServices.length === 0) {
        container.innerHTML = '<div class="empty-state-list"><i class="fas fa-box-open"></i>No available services</div>';
        return;
    }
    
    container.innerHTML = filteredServices.map(service => `
        <label class="service-checkbox-item" data-service-id="${service.id}">
            <input type="checkbox" class="service-checkbox-available" value="${service.id}" data-service-name="${escapeHtml(service.service_name)}">
            <div class="service-info">
                <div class="service-name">${escapeHtml(service.service_name)}</div>
                ${service.description ? `<div class="service-description">${escapeHtml(service.description)}</div>` : ''}
            </div>
            ${service.price ? `<span class="service-price">GH¢${service.price.toFixed(2)}</span>` : ''}
        </label>
    `).join('');
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.service-checkbox-available').forEach(cb => {
        cb.addEventListener('change', updateAssignSelectedCount);
    });
}

// Load user's assigned services for modal
async function loadUserAssignedServicesDataModal(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/services`, {
            headers: getApiHeaders()
        });
        const result = await response.json();
        if (result.success) {
            userAssignedServicesList = result.data;
            renderAvailableServicesModal();
            renderAssignedServicesModal();
        }
    } catch (error) {
        console.error('Error loading user services:', error);
    }
}

// Render available services in modal
function renderAvailableServicesModal() {
    const container = document.getElementById('availableServicesList');
    if (!container) return;
    
    const assignedServiceIds = new Set(userAssignedServicesList.map(s => s.id));
    let filteredServices = allServicesList.filter(s => !assignedServiceIds.has(s.id));
    
    if (availableServicesFilter) {
        filteredServices = filteredServices.filter(s => 
            s.service_name.toLowerCase().includes(availableServicesFilter) ||
            (s.description && s.description.toLowerCase().includes(availableServicesFilter))
        );
    }
    
    if (filteredServices.length === 0) {
        container.innerHTML = '<div class="empty-state-list"><i class="fas fa-box-open"></i>No available services</div>';
        return;
    }
    
    container.innerHTML = filteredServices.map(service => `
        <label class="service-checkbox-item" data-service-id="${service.id}">
            <input type="checkbox" class="service-checkbox-available" value="${service.id}" data-service-name="${escapeHtml(service.service_name)}">
            <div class="service-info">
                <div class="service-name">${escapeHtml(service.service_name)}</div>
                ${service.description ? `<div class="service-description">${escapeHtml(service.description)}</div>` : ''}
            </div>
            ${service.price ? `<span class="service-price">GH¢${service.price.toFixed(2)}</span>` : ''}
        </label>
    `).join('');
    
    document.querySelectorAll('.service-checkbox-available').forEach(cb => {
        cb.addEventListener('change', updateAssignSelectedCount);
    });
    updateAssignSelectedCount();
}

// Render assigned services in modal
function renderAssignedServicesModal() {
    const container = document.getElementById('assignedServicesList');
    if (!container) return;
    
    let filteredServices = [...userAssignedServicesList];
    
    if (assignedServicesFilter) {
        filteredServices = filteredServices.filter(s => 
            s.service_name.toLowerCase().includes(assignedServicesFilter) ||
            (s.description && s.description.toLowerCase().includes(assignedServicesFilter))
        );
    }
    
    if (filteredServices.length === 0) {
        container.innerHTML = '<div class="empty-state-list"><i class="fas fa-tasks"></i>No services assigned</div>';
        return;
    }
    
    container.innerHTML = filteredServices.map(service => `
        <label class="service-checkbox-item assigned" data-service-id="${service.id}">
            <input type="checkbox" class="service-checkbox-assigned" value="${service.id}" data-service-name="${escapeHtml(service.service_name)}">
            <div class="service-info">
                <div class="service-name">${escapeHtml(service.service_name)}</div>
                ${service.description ? `<div class="service-description">${escapeHtml(service.description)}</div>` : ''}
            </div>
            ${service.price ? `<span class="service-price">GH¢${service.price.toFixed(2)}</span>` : ''}
        </label>
    `).join('');
    
    document.querySelectorAll('.service-checkbox-assigned').forEach(cb => {
        cb.addEventListener('change', updateRemoveSelectedCount);
    });
    updateRemoveSelectedCount();
}

// Update assign selected count
function updateAssignSelectedCount() {
    const selected = document.querySelectorAll('.service-checkbox-available:checked').length;
    const countSpan = document.getElementById('selectedCount');
    const assignBtn = document.getElementById('assignSelectedBtn');
    
    if (countSpan) countSpan.textContent = selected;
    if (assignBtn) assignBtn.disabled = selected === 0;
}

// Update remove selected count
function updateRemoveSelectedCount() {
    const selected = document.querySelectorAll('.service-checkbox-assigned:checked').length;
    const countSpan = document.getElementById('removeSelectedCount');
    const removeBtn = document.getElementById('removeSelectedBtn');
    
    if (countSpan) countSpan.textContent = selected;
    if (removeBtn) removeBtn.disabled = selected === 0;
}

// Assign selected services
async function assignSelectedServices() {
    if (!selectedUserIdForServices) {
        showMessageModal('No user selected', 'warning');
        return;
    }
    
    const selectedCheckboxes = document.querySelectorAll('.service-checkbox-available:checked');
    if (selectedCheckboxes.length === 0) return;
    
    const serviceIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    const serviceNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.serviceName);
    
    showConfirmModal(`Assign ${serviceNames.length} service(s) to this user?`, async () => {
        try {
            let successCount = 0;
            for (const serviceId of serviceIds) {
                const response = await fetch(`${API_BASE_URL}/users/services/assign`, {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify({ 
                        userId: selectedUserIdForServices, 
                        serviceId: serviceId,
                        assignedBy: currentUser.username 
                    })
                });
                const result = await response.json();
                if (result.success) successCount++;
            }
            
            if (successCount > 0) {
                showMessageModal(`${successCount} service(s) assigned successfully!`, 'success');
                await loadUserAssignedServicesDataModal(selectedUserIdForServices);
                logActivity(`Assigned ${successCount} service(s) to user ID ${selectedUserIdForServices}`);
            } else {
                showMessageModal('Failed to assign services', 'error');
            }
        } catch (error) {
            console.error('Error assigning services:', error);
            showMessageModal('Error assigning services', 'error');
        }
    });
}

// Remove selected services
async function removeSelectedServices() {
    if (!selectedUserIdForServices) {
        showMessageModal('No user selected', 'warning');
        return;
    }
    
    const selectedCheckboxes = document.querySelectorAll('.service-checkbox-assigned:checked');
    if (selectedCheckboxes.length === 0) return;
    
    const serviceIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    const serviceNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.serviceName);
    
    showConfirmModal(`Remove ${serviceNames.length} service(s) from this user?`, async () => {
        try {
            let successCount = 0;
            for (const serviceId of serviceIds) {
                const response = await fetch(`${API_BASE_URL}/users/${selectedUserIdForServices}/services/${serviceId}`, {
                    method: 'DELETE',
                    headers: getApiHeaders(),
                    body: JSON.stringify({ deletedBy: currentUser.username })
                });
                const result = await response.json();
                if (result.success) successCount++;
            }
            
            if (successCount > 0) {
                showMessageModal(`${successCount} service(s) removed successfully!`, 'success');
                await loadUserAssignedServicesDataModal(selectedUserIdForServices);
                logActivity(`Removed ${successCount} service(s) from user ID ${selectedUserIdForServices}`);
            } else {
                showMessageModal('Failed to remove services', 'error');
            }
        } catch (error) {
            console.error('Error removing services:', error);
            showMessageModal('Error removing services', 'error');
        }
    });
}

// Setup event listeners for user services page
function setupUserServicesEventListeners() {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const clearBtn = document.getElementById('clearUserSearch');
            if (clearBtn) clearBtn.style.display = e.target.value ? 'flex' : 'none';
            renderUsersTable(allUsersList);
        });
    }
    
    const clearSearch = document.getElementById('clearUserSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            const searchInput = document.getElementById('userSearchInput');
            if (searchInput) {
                searchInput.value = '';
                clearSearch.style.display = 'none';
                renderUsersTable(allUsersList);
            }
        });
    }
    
    const availableSearch = document.getElementById('availableServicesSearch');
    if (availableSearch) {
        availableSearch.addEventListener('input', (e) => {
            availableServicesFilter = e.target.value.toLowerCase();
            renderAvailableServicesModal();
        });
    }
    
    const assignedSearch = document.getElementById('assignedServicesSearch');
    if (assignedSearch) {
        assignedSearch.addEventListener('input', (e) => {
            assignedServicesFilter = e.target.value.toLowerCase();
            renderAssignedServicesModal();
        });
    }
    
    const assignBtn = document.getElementById('assignSelectedBtn');
    if (assignBtn) assignBtn.addEventListener('click', assignSelectedServices);
    
    const removeBtn = document.getElementById('removeSelectedBtn');
    if (removeBtn) removeBtn.addEventListener('click', removeSelectedServices);
}   



// Render users table - FIXED VERSION
function renderUsersTable(users) {
    const tbody = document.getElementById('usersServicesTableBody');
    if (!tbody) return; 

    // console.log('users:', users);
    
    // Filter to users and user-admins
    let assignableUsers = users.filter(u => u.role === 'user' || u.role === 'user-admin');
    
    // Apply search filter
    const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        assignableUsers = assignableUsers.filter(user => 
            user.username?.toLowerCase().includes(searchTerm) ||
            (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
            (user.last_name && user.last_name.toLowerCase().includes(searchTerm)) ||
            (user.middle_name && user.middle_name.toLowerCase().includes(searchTerm)) ||
            user.special_id?.toLowerCase().includes(searchTerm) ||
            user.phone_number?.toLowerCase().includes(searchTerm) ||
            `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm)
        );
    }
    
    if (assignableUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = assignableUsers.map(user => {
        const fullName = [user.first_name, user.middle_name, user.last_name].filter(n => n && n.trim()).join(' ') || user.username;
        const initials = getInitials(fullName);
        const roleDisplay = getRoleDisplayName(user.role);
        
        // Safely handle services
        let servicesList = [];
        if (user.services && Array.isArray(user.services)) {
            servicesList = user.services;
        } else if (user.assigned_services && Array.isArray(user.assigned_services)) {
            servicesList = user.assigned_services;
        } else if (user.user_services && Array.isArray(user.user_services)) {
            servicesList = user.user_services;
        }
        
        const servicesHtml = servicesList.length > 0 
            ? `<div class="services-badge-container">${servicesList.map(s => `<span class="service-badge-small">${escapeHtml(s.service_name || s.name || 'Unknown')}</span>`).join('')}</div>`
            : '<span class="no-services-text">No services assigned</span>';
        
        // Escape all string values for safe HTML
        const escapedFullName = escapeHtml(fullName);
        const escapedUsername = escapeHtml(user.username);
        const escapedSpecialId = escapeHtml(user.special_id?.substring(0, 8) || 'N/A');
        const escapedPhone = escapeHtml(user.phone_number || '');
        
        // Create safe onclick attribute
        const onclickAttr = `openServiceAssignmentModal(${user.id}, '${escapedFullName.replace(/'/g, "\\'")}', '${escapedSpecialId.replace(/'/g, "\\'")}', '${escapedUsername.replace(/'/g, "\\'")}', '${escapedPhone.replace(/'/g, "\\'")}')`;
        
        return `
            <tr>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-small">${escapeHtml(initials)}</div>
                        <div>
                            <div class="user-name-text">${escapedFullName}</div>
                            <div class="user-email-text">${escapedUsername}</div>
                        </div>
                    </div>
                </td>
                <td><code>${escapedSpecialId}</code></td>
                <td><span class="role-badge-row ${user.role}" style="background: ${getRoleColor(user.role)}; padding: 4px 10px; font-size: 11px;">${escapeHtml(roleDisplay)}</span></td>
                <td class="services-cell">${servicesHtml}</td>
                <td class="action-buttons-cell">
                    <button class="assign-service-btn" onclick="${onclickAttr}">
                        <i class="fas fa-cog"></i> Manage Services
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


// Helper function to safely escape strings for onclick attributes
function escapeForOnClick(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
} 



// Open service assignment modal
async function openServiceAssignmentModal(userId, fullName, staffId, username, phone) {
    selectedUserIdForServices = userId;
    
    // Set modal info - populate BOTH elements
    const modalUserName = document.getElementById('modalUserName');
    // const modalUserFullName = document.getElementById('modalUserInfo modalUserFullName');
     const modalUserFullName = document.getElementById('modalUserNameInFull');  
    const modalUserId = document.getElementById('modalUserId');
    const modalStaffId = document.getElementById('modalStaffId');
    const modalUsername = document.getElementById('modalUsername');
    const modalPhone = document.getElementById('modalPhone');
    
    if (modalUserName) modalUserName.textContent = fullName;
    if (modalUserFullName) modalUserFullName.textContent = fullName;
    if (modalUserId) modalUserId.value = userId;
    if (modalStaffId) modalStaffId.textContent = staffId?.substring(0, 8) || 'N/A';
    if (modalUsername) modalUsername.textContent = username;
    if (modalPhone) modalPhone.textContent = phone || 'Not provided';
    
    // Also set the avatar with initials
    const avatar = document.getElementById('modalUserAvatar');
    if (avatar) {
        const initials = getInitials(fullName);
        avatar.innerHTML = initials;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
    }
    
    // Show modal
    showModal('serviceAssignmentModal');
    
    // Load services
    await loadAllServicesForAssignmentModal();
    await loadUserAssignedServicesDataModal(userId);
}




////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== //// 
//// ===============   END OF NEW SERVICE ASSIGNMENT    ======================= ////
//// ===============   END OF NEW SERVICE ASSIGNMENT    ======================= ////
//// ===============   END OF NEW SERVICE ASSIGNMENT    ======================= ////
//// ===============   END OF NEW SERVICE ASSIGNMENT    ======================= ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== ////
////=========================================================================== //// 

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================
function getUserInitials(username) {
    if (!username) return 'U';
    const parts = username.split(' ');
    if (parts.length === 1) return username.substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

async function addUserServiceSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            const select = document.getElementById('userServicesListSelect');
            if (select) {
                select.innerHTML = '<option value="">Select User Service</option>' + 
                    result.data.map(acc => `<option value="${acc.id}">${escapeHtml(acc.service_name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading services for user select:', error);
    }
}

async function editUser(specialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/status/${specialId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            await showUserEditModal('editUsername', result.data);
        } else {
            showMessageModal('Error loading user details', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessageModal('Error loading user details', 'error');
    }
}

async function changeUserPassword(specialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/status/${specialId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            await showUserEditModal('changePassword', result.data);
        } else {
            showMessageModal('Error loading user details', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessageModal('Error loading user details', 'error');
    }
}

async function toggleUserBlock(specialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/status/${specialId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            const action = result.data.status === 'blocked' ? 'unblock' : 'block';
            await showUserEditModal(action, result.data);
        } else {
            showMessageModal('Error loading user details', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessageModal('Error loading user details', 'error');
    }
}

async function suspendUser(specialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/status/${specialId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            await showUserEditModal('suspend', result.data);
        } else {
            showMessageModal('Error loading user details', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessageModal('Error loading user details', 'error');
    }
}

async function unsuspendUser(specialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/status/${specialId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            await showUserEditModal('unsuspend', result.data);
        } else {
            showMessageModal('Error loading user details', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessageModal('Error loading user details', 'error');
    }
}

async function deleteUser(specialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/status/${specialId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            await showUserEditModal('delete', result.data);
        } else {
            showMessageModal('Error loading user details', 'error');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessageModal('Error loading user details', 'error');
    }
}

// ============================================
// USER EDIT MODAL FUNCTIONS
// ============================================
async function showUserEditModal(action, user) {
    currentEditingUser = user;
    currentEditAction = action;
    const modal = document.getElementById('userEditModal');
    const title = document.getElementById('userEditModalTitle');
    const content = document.getElementById('userEditContent');
    const confirmBtn = document.getElementById('userEditConfirmBtn');
    const cancelBtn = document.getElementById('userEditCancelBtn');
    
    switch(action) {
        case 'editUsername':
            title.innerHTML = '<i class="fas fa-user-edit"></i> Edit Username';
            content.innerHTML = renderEditUsernameForm(user);
            break;
        case 'changePassword':
            title.innerHTML = '<i class="fas fa-key"></i> Change Password';
            content.innerHTML = renderChangePasswordForm(user);
            attachPasswordStrengthChecker();
            break;
        case 'block':
            title.innerHTML = '<i class="fas fa-ban"></i> Block User';
            content.innerHTML = renderBlockUserForm(user);
            break;
        case 'unblock':
            title.innerHTML = '<i class="fas fa-check-circle"></i> Unblock User';
            content.innerHTML = renderUnblockUserForm(user);
            break;
        case 'suspend':
            title.innerHTML = '<i class="fas fa-pause-circle"></i> Suspend User';
            content.innerHTML = renderSuspendUserForm(user);
            break;
        case 'unsuspend':
            title.innerHTML = '<i class="fas fa-play-circle"></i> Unsuspend User';
            content.innerHTML = renderUnsuspendUserForm(user);
            break;
        case 'delete':
            title.innerHTML = '<i class="fas fa-trash-alt"></i> Delete User';
            content.innerHTML = renderDeleteUserForm(user);
            break;
        default: return;
    }
    
    confirmBtn.onclick = () => handleUserEditConfirm();
    cancelBtn.onclick = () => closeModal('userEditModal');
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => closeModal('userEditModal');
    showModal('userEditModal');
}

function renderEditUsernameForm(user) {
    return `
        <div class="user-edit-form">
            <div class="info-message"><i class="fas fa-info-circle"></i> <strong>Editing username for: ${escapeHtml(user.username)}</strong></div>
            <div class="form-group"><label><i class="fas fa-user"></i> New Username</label><input type="text" id="newUsername" placeholder="Enter new username" value="${escapeHtml(user.username)}" autocomplete="off"><div class="hint"><i class="fas fa-lightbulb"></i> Username must be unique and at least 3 characters long</div></div>
            <div class="form-group"><label><i class="fas fa-lock"></i> Confirm Action</label><input type="password" id="confirmAction" placeholder="Enter your admin password to confirm"><div class="hint"><i class="fas fa-shield-alt"></i> Admin password required for security</div></div>
        </div>
    `;
}

function renderChangePasswordForm(user) {
    return `
        <div class="user-edit-form">
            <div class="info-message"><i class="fas fa-info-circle"></i> <strong>Changing password for: ${escapeHtml(user.username)}</strong></div>
            <div class="form-group"><label><i class="fas fa-lock"></i> New Password</label><input type="password" id="newPassword" placeholder="Enter new password" onkeyup="checkPasswordStrength(this.value)"><div class="password-strength"><div class="password-strength-bar" id="passwordStrengthBar"></div></div><div class="hint"><i class="fas fa-lightbulb"></i> Password must be at least 6 characters</div></div>
            <div class="form-group"><label><i class="fas fa-check-circle"></i> Confirm New Password</label><input type="password" id="confirmPassword" placeholder="Confirm new password"></div>
            <div class="form-group"><label><i class="fas fa-info-circle"></i> Add password Hint</label><input type="text" id="passwordHint" placeholder="Add a password hint (optional)"></div>
            <div class="form-group"><label><i class="fas fa-shield-alt"></i> Admin Password</label><input type="password" id="adminPassword" placeholder="Enter your admin password to confirm"></div>
        </div>
    `;
}

function renderBlockUserForm(user) {
    return `
        <div class="user-edit-form">
            <div class="warning-message"><i class="fas fa-exclamation-triangle"></i> <strong>Warning: You are about to block this user!</strong></div>
            <div class="user-details"><p><strong>Username:</strong> ${escapeHtml(user.username)}</p><p><strong>Role:</strong> ${getRoleDisplayName(user.role)}</p><p><strong>User ID:</strong> ${user.special_id || 'N/A'}</p><p><strong>Current Status:</strong> <span class="badge" style="background: #f59e0b;">${user.status || 'active'}</span></p></div>
            <div class="form-group"><label><i class="fas fa-comment"></i> Reason (Optional)</label><textarea id="blockReason" rows="3" placeholder="Enter reason for blocking this user..."></textarea><div class="hint"><i class="fas fa-lightbulb"></i> This reason will be logged for audit purposes</div></div>
            <div class="form-group"><label><i class="fas fa-shield-alt"></i> Confirm Block</label><input type="password" id="adminPassword" placeholder="Enter your admin password to confirm"><div class="hint"><i class="fas fa-shield-alt"></i> Admin password required for security</div></div>
            <div class="danger-message"><i class="fas fa-ban"></i> <strong>Blocked users cannot:</strong><ul><li>Login to the system</li><li>Create or edit invoices</li><li>Access any system features</li></ul></div>
        </div>
    `;
}

function renderUnblockUserForm(user) {
    return `
        <div class="user-edit-form">
            <div class="info-message"><i class="fas fa-info-circle"></i> <strong>You are about to unblock ${escapeHtml(user.username)}</strong></div>
            <div class="user-details"><p><strong>Username:</strong> ${escapeHtml(user.username)}</p><p><strong>Role:</strong> ${getRoleDisplayName(user.role)}</p><p><strong>User ID:</strong> ${user.special_id || 'N/A'}</p><p><strong>Current Status:</strong> <span class="badge" style="background: #ef4444;">${user.status || 'blocked'}</span></p></div>
            <div class="form-group"><label><i class="fas fa-shield-alt"></i> Confirm Unblock</label><input type="password" id="adminPassword" placeholder="Enter your admin password to confirm"></div>
        </div>
    `;
}

function renderSuspendUserForm(user) {
    return `
        <div class="user-edit-form">
            <div class="warning-message"><i class="fas fa-exclamation-triangle"></i> <strong>Warning: You are about to suspend this user!</strong></div>
            <div class="user-details"><p><strong>Username:</strong> ${escapeHtml(user.username)}</p><p><strong>Role:</strong> ${getRoleDisplayName(user.role)}</p><p><strong>User ID:</strong> ${user.special_id || 'N/A'}</p><p><strong>Current Status:</strong> <span class="badge" style="background: #f59e0b;">${user.status || 'active'}</span></p></div>
            <div class="form-group"><label><i class="fas fa-calendar"></i> Suspension Duration</label><select id="suspensionDays"><option value="1">1 day</option><option value="3">3 days</option><option value="7" selected>7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option></select></div>
            <div class="form-group"><label><i class="fas fa-comment"></i> Reason (Optional)</label><textarea id="suspendReason" rows="3" placeholder="Enter reason for suspending this user..."></textarea></div>
            <div class="form-group"><label><i class="fas fa-shield-alt"></i> Confirm Suspension</label><input type="password" id="adminPassword" placeholder="Enter your admin password to confirm"></div>
            <div class="danger-message"><i class="fas fa-pause-circle"></i> <strong>Suspended users cannot access the system until the suspension period ends.</strong></div>
        </div>
    `;
}

function renderUnsuspendUserForm(user) {
    return `
        <div class="user-edit-form">
            <div class="info-message"><i class="fas fa-info-circle"></i> <strong>You are about to unsuspend ${escapeHtml(user.username)}</strong></div>
            <div class="user-details"><p><strong>Username:</strong> ${escapeHtml(user.username)}</p><p><strong>Role:</strong> ${getRoleDisplayName(user.role)}</p><p><strong>User ID:</strong> ${user.special_id || 'N/A'}</p><p><strong>Current Status:</strong> <span class="badge" style="background: #f59e0b;">${user.status || 'suspended'}</span></p></div>
            <div class="form-group"><label><i class="fas fa-shield-alt"></i> Confirm Unsuspend</label><input type="password" id="adminPassword" placeholder="Enter your admin password to confirm"></div>
        </div>
    `;
}

function renderDeleteUserForm(user) {
    return `
        <div class="user-edit-form">
            <div class="danger-message"><i class="fas fa-skull-crosswalk"></i> <strong>DANGER: You are about to permanently delete this user!</strong><p>This action <strong>CANNOT</strong> be undone!</p></div>
            <div class="user-details"><p><strong>Username:</strong> ${escapeHtml(user.username)}</p><p><strong>Role:</strong> ${getRoleDisplayName(user.role)}</p><p><strong>User ID:</strong> ${user.special_id || 'N/A'}</p><p><strong>Created:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p><p><strong>Assigned Services:</strong> ${user.assigned_services_count || 0}</p><p><strong>Invoices Created:</strong> ${user.invoices_count || 0}</p></div>
            <div class="form-group"><label><i class="fas fa-exclamation-triangle"></i> Type "DELETE" to confirm</label><input type="text" id="deleteConfirmText" placeholder="Type DELETE here"></div>
            <div class="form-group"><label><i class="fas fa-shield-alt"></i> Admin Password</label><input type="password" id="adminPassword" placeholder="Enter your admin password to confirm"></div>
        </div>
    `;
}

async function handleUserEditConfirm() {
    switch(currentEditAction) {
        case 'changePassword': await confirmChangePassword(); break;
        case 'block': await confirmBlockUser(); break;
        case 'unblock': await confirmUnblockUser(); break;
        case 'suspend': await confirmSuspendUser(); break;
        case 'unsuspend': await confirmUnsuspendUser(); break;
        case 'delete': await confirmDeleteUser(); break;
    }
}

async function confirmChangePassword() {
    const oldPassword = document.getElementById('oldPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const adminPassword = document.getElementById('adminPassword')?.value;
    
    if (!oldPassword) { showMessageModal('Please enter the current password', 'warning'); return; }
    if (!newPassword) { showMessageModal('Please enter a new password', 'warning'); return; }
    if (newPassword.length < 6) { showMessageModal('New password must be at least 6 characters', 'warning'); return; }
    if (newPassword !== confirmPassword) { showMessageModal('New passwords do not match', 'warning'); return; }
    if (!adminPassword) { showMessageModal('Please enter admin password to confirm', 'warning'); return; }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/change-password/${currentEditingUser.special_id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ oldPassword, newPassword, changedBy: currentUser.username })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Password changed successfully!', 'success');
            closeModal('userEditModal');
            logActivity(`Changed password for user ${currentEditingUser.special_id}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showMessageModal('Error changing password', 'error');
    }
}

async function confirmBlockUser() {
    const adminPassword = document.getElementById('adminPassword')?.value;
    const reason = document.getElementById('blockReason')?.value || 'No reason provided';
    if (!adminPassword) { showMessageModal('Please enter admin password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/block/${currentEditingUser.special_id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ reason, blockedBy: currentUser.username })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('User blocked successfully!', 'success');
            closeModal('userEditModal');
            loadUsers();
            logActivity(`Blocked user ${currentEditingUser.special_id}. Reason: ${reason}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error blocking user:', error);
        showMessageModal('Error blocking user', 'error');
    }
}

async function confirmUnblockUser() {
    const adminPassword = document.getElementById('adminPassword')?.value;
    if (!adminPassword) { showMessageModal('Please enter admin password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/unblock/${currentEditingUser.special_id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ unblockedBy: currentUser.username })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('User unblocked successfully!', 'success');
            closeModal('userEditModal');
            loadUsers();
            logActivity(`Unblocked user ${currentEditingUser.special_id}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error unblocking user:', error);
        showMessageModal('Error unblocking user', 'error');
    }
}

async function confirmSuspendUser() {
    const adminPassword = document.getElementById('adminPassword')?.value;
    const suspensionDays = document.getElementById('suspensionDays')?.value;
    const reason = document.getElementById('suspendReason')?.value || 'No reason provided';
    if (!adminPassword) { showMessageModal('Please enter admin password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/suspend/${currentEditingUser.special_id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ days: parseInt(suspensionDays), reason, suspendedBy: currentUser.username })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal(`User suspended for ${suspensionDays} days!`, 'success');
            closeModal('userEditModal');
            loadUsers();
            logActivity(`Suspended user ${currentEditingUser.special_id} for ${suspensionDays} days. Reason: ${reason}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        showMessageModal('Error suspending user', 'error');
    }
}

async function confirmUnsuspendUser() {
    const adminPassword = document.getElementById('adminPassword')?.value;
    if (!adminPassword) { showMessageModal('Please enter admin password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/unsuspend/${currentEditingUser.special_id}`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ unsuspendedBy: currentUser.username })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('User unsuspended successfully!', 'success');
            closeModal('userEditModal');
            loadUsers();
            logActivity(`Unsuspended user ${currentEditingUser.special_id}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error unsuspending user:', error);
        showMessageModal('Error unsuspending user', 'error');
    }
}

async function confirmDeleteUser() {
    const confirmText = document.getElementById('deleteConfirmText')?.value;
    const adminPassword = document.getElementById('adminPassword')?.value;
    if (confirmText !== 'DELETE') { showMessageModal('Please type "DELETE" to confirm user deletion', 'warning'); return; }
    if (!adminPassword) { showMessageModal('Please enter admin password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/delete/${currentEditingUser.special_id}`, {
            method: 'DELETE',
            headers: getApiHeaders(),
            body: JSON.stringify({ deletedBy: currentUser.username })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('User deleted successfully!', 'success');
            closeModal('userEditModal');
            loadUsers();
            logActivity(`Deleted user ${currentEditingUser.special_id}`);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessageModal('Error deleting user', 'error');
    }
}

function checkPasswordStrength(password) {
    const bar = document.getElementById('passwordStrengthBar');
    if (!bar) return;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    bar.className = 'password-strength-bar';
    if (strength <= 2) bar.classList.add('weak');
    else if (strength <= 4) bar.classList.add('medium');
    else bar.classList.add('strong');
}

function attachPasswordStrengthChecker() {
    const passwordInput = document.getElementById('newPassword');
    if (passwordInput) passwordInput.addEventListener('keyup', (e) => checkPasswordStrength(e.target.value));
}

async function passwordMatch() {
    const password = document.getElementById('modalNewPassword');
    const confirmPass = document.getElementById('modalNewConfirmPassword');
    const messageSpan = document.querySelector('.passComfirmMessage');
    if (password && confirmPass && messageSpan) {
        confirmPass.addEventListener('keyup', () => {
            if (password.value === confirmPass.value && password.value !== '') {
                messageSpan.classList.remove('passDontMatch');
                messageSpan.classList.add('passMatch');
                messageSpan.innerHTML = '✓ Passwords match!';
                messageSpan.style.color = '#10b981';
            } else if (password.value !== confirmPass.value && confirmPass.value !== '') {
                messageSpan.classList.remove('passMatch');
                messageSpan.classList.add('passDontMatch');
                messageSpan.innerHTML = '✗ Passwords do not match!';
                messageSpan.style.color = '#ef4444';
            } else {
                messageSpan.innerHTML = 'passwords don\'t match.....';
                messageSpan.style.color = '';
            }
        });
    }
}

// ============================================
// PROFILE FUNCTIONS
// ============================================

// Update loadAccountProfile function to include full name fields
async function loadAccountProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/current`, { headers: getApiHeaders() });
        const result = await response.json(); 
        // console.log('current user results:', result);
        
        if (result.success) {
            const user = result.data;
            
            // Set basic info
            document.getElementById('profileUsername').textContent = user.username;
            document.getElementById('profileAccountNumber').textContent = user.special_id || 'N/A';
            document.getElementById('profileRole').textContent = getRoleDisplayName(user.role);
            document.getElementById('profileRole').style.background = getRoleColor(user.role);
            
            // Set full name and individual name fields
            const fullName = [user.first_name, user.middle_name, user.last_name].filter(n => n && n.trim()).join(' ') || user.username;
            const fullNameElement = document.getElementById('profileFullName'); 


            const fullNameElements = fullNameElement.innerHTML = '<span id="profileFirstName"></span> <span id="profileMiddleName"></span> <span id="profileLastName"></span>'  ;  

             if (fullNameElement) fullNameElement.innerHTML = fullNameElements;
            // Set individual name fields
            const firstNameElement = document.getElementById('profileFirstName');
            if (firstNameElement) firstNameElement.textContent = user.first_name || '-';
            
            const middleNameElement = document.getElementById('profileMiddleName');
            if (middleNameElement) middleNameElement.textContent = user.middle_name || '-';
            
            const lastNameElement = document.getElementById('profileLastName');
            if (lastNameElement) lastNameElement.textContent = user.last_name || '-';     


            
            
            // Set phone number
            const phoneElement = document.getElementById('profilePhone');
            if (phoneElement) phoneElement.textContent = user.phone_number || 'Not specified';
            
            // Set gender
            const sexElement = document.getElementById('profileSex');
            if (sexElement) sexElement.textContent = user.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : 'Not specified';
            
            // Set age from DOB
            let ageText = 'Not specified';
            if (user.date_of_birth) {
                const birthDate = new Date(user.date_of_birth);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
                ageText = `${age} years (${new Date(user.date_of_birth).toLocaleDateString()})`;
            }
            const ageElement = document.getElementById('profileAge');
            if (ageElement) ageElement.textContent = ageText;
            
            // Set status badge
            const statusBadge = document.getElementById('profileStatus');
            if (statusBadge) {
                if (user.status === 'suspended') {
                    statusBadge.textContent = 'Suspended';
                    statusBadge.className = 'status-badge suspended';
                } else if (user.status === 'blocked') {
                    statusBadge.textContent = 'Blocked';
                    statusBadge.className = 'status-badge blocked';
                } else {
                    statusBadge.textContent = 'Active';
                    statusBadge.className = 'status-badge';
                }
            }
            
            // Set dates
            if (user.created_at) document.getElementById('profileMemberSince').textContent = new Date(user.created_at).toLocaleDateString();
            document.getElementById('profileLastLogin').textContent = user.last_login ? new Date(user.last_login).toLocaleString() : 'First login';
            
            // Update avatar
            updateProfileAvatar(user.first_name || user.username);
            
            // Load services and activity
            await loadProfileServices();
            await loadProfileRecentActivity();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessageModal('Error loading profile', 'error');
    }
}



// In your app.js, add a function to verify password
async function verifyPassword(password) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/verify-password`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ 
                username: currentUser.username, 
                password: password 
            })
        });
        
        const result = await response.json();
        return result.success && result.valid === true;
        
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
}

// Add function to update full name
async function handleUpdateFullname(e) {
    e.preventDefault(); 

    
    
    const firstName = document.getElementById('editFirstName').value.trim();
    const middleName = document.getElementById('editMiddleName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const confirmPassword = document.getElementById('fullnameConfirmPassword').value;
    
    // Validation
    if (!firstName) {
        showMessageModal('Please enter first name', 'warning');
        return;
    }
    
    if (!lastName) {
        showMessageModal('Please enter last name', 'warning');
        return;
    }
    
    if (!confirmPassword) {
        showMessageModal('Please enter your password to confirm', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-details`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ 
                firstName, 
                middleName: middleName || null, 
                lastName, 
                password: confirmPassword 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessageModal('Full name updated successfully!', 'success');
            closeModal('fullnameModal');
            
            // Update current user data
            if (currentUser) {
                currentUser.first_name = firstName;
                currentUser.middle_name = middleName;
                currentUser.last_name = lastName;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            // Reload profile to show updated info
            setTimeout(() => loadAccountProfile(), 500);
            logActivity('Updated profile full name');
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating full name:', error);
        showMessageModal('Error updating full name', 'error');
    }
} 


// Add function to update phone number
async function handleUpdatePhone(e) {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('editPhoneNumber').value.trim();
    const confirmPassword = document.getElementById('phoneConfirmPassword').value;
    
    // Validation
    if (!phoneNumber) {
        showMessageModal('Please enter phone number', 'warning');
        return;
    }
    
    // Basic phone number validation (Ghana format)
    const phoneRegex = /^(0[2-9]\d{7,8})$/;  
    // remove "-" from phone number 
    const NPN =  phoneNumber.replace( /-/g , "") 

    if (!phoneRegex.test(NPN)) {
        showMessageModal('Please enter a valid phone number (e.g., 024-XXX-XXXX)', 'warning');
        return;
    }
    
    if (!confirmPassword) {
        showMessageModal('Please enter your password to confirm', 'warning');
        return;
    }
    
    try {       
        const response = await fetch(`${API_BASE_URL}/users/update-profile-details`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ 
                phoneNumber, 
                password: confirmPassword 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessageModal('Phone number updated successfully!', 'success');
            closeModal('phoneModal');
            
            // Update current user data
            if (currentUser) {
                currentUser.phone_number = phoneNumber;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            // Reload profile to show updated info
            setTimeout(() => loadAccountProfile(), 500);
            logActivity('Updated profile phone number');
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating phone number:', error);
        showMessageModal('Error updating phone number', 'error');
    }
}  



// Update setupProfileEventListeners function
function setupProfileEventListeners() {
    const updateUsernameForm = document.getElementById('updateUsernameForm');
    if (updateUsernameForm) updateUsernameForm.addEventListener('submit', handleUpdateUsername);
    
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) updatePasswordForm.addEventListener('submit', handleUpdatePassword);
    
    const changeUsernameForm = document.getElementById('changeUsernameForm');
    if (changeUsernameForm) changeUsernameForm.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        await handleModalUpdateUsername(); 
    });
    
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) changePasswordForm.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        await handleModalUpdatePassword(); 
    });
    
    // Add new event listeners
  
    
    const updatePhoneForm = document.getElementById('updatePhoneForm');
    if (updatePhoneForm) updatePhoneForm.addEventListener('submit', handleUpdatePhone);  

    const updateFullNameForm = document.getElementById('updateFullnameForm');
    if (updateFullNameForm) updateFullNameForm.addEventListener('submit', handleUpdateFullname); 


   
}

async function loadProfileServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/my-services`, { headers: getApiHeaders() });
        const result = await response.json();
        const servicesContainer = document.getElementById('profileServices');
        if (result.success && result.data && result.data.length > 0) {
            servicesContainer.innerHTML = result.data.map(s => `<span class="service-tag"><i class="fas fa-stethoscope"></i> ${escapeHtml(s.service_name)}</span>`).join('');
        } else {
            servicesContainer.innerHTML = '<span class="empty-text">No services assigned</span>';
        }
    } catch (error) {
        console.error('Error loading profile services:', error);
    }
}

async function loadProfileRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/activity-log`, { headers: getApiHeaders() });
        const result = await response.json();
        const container = document.getElementById('profileRecentActivity');
        if (result.success && result.data) {
            let activities = result.data;
            if (Array.isArray(activities) && activities.length === 1 && Array.isArray(activities[0])) activities = activities[0];
            container.innerHTML = (activities || []).slice(0, 5).map(log => `
                <div class="activity-item">
                    <i class="fas fa-circle"></i>
                    <div class="activity-content">
                        <p class="activity-action">${escapeHtml(log.action || 'No action')}</p>
                        <small class="activity-time">${new Date(log.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
        }
    } catch (error) {
        console.error('Error loading profile activity:', error);
    }
}

function updateProfileAvatar(username) {
    const profileAvatar = document.getElementById('profileAvatar');
    if (!profileAvatar) return;
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const colorIndex = username.length % colors.length;
    profileAvatar.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${colors[colorIndex]};border-radius:50%;font-size:32px;font-weight:bold;color:white;text-transform:uppercase;">${initials || 'U'}</div>`;
}

function updateTopHeaderAvatar(username) {
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    if (!userAvatarSmall) return;
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];
    const colorIndex = username.length % colors.length;
    userAvatarSmall.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${colors[colorIndex]};border-radius:50%;font-size:14px;font-weight:bold;color:white;">${initials || 'U'}</div>`;
}

async function handleUpdateUsername(e) {
    e.preventDefault();
    const newUsername = document.getElementById('newUsernameProfile').value.trim();
    const confirmPassword = document.getElementById('usernameConfirmPassword').value;
    if (!newUsername) { showMessageModal('Please enter a new username', 'warning'); return; }
    if (newUsername.length < 3) { showMessageModal('Username must be at least 3 characters', 'warning'); return; }
    if (!confirmPassword) { showMessageModal('Please enter your password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-username`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ newUsername, password: confirmPassword })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Username updated successfully! Please login again.', 'success');
            currentUser.username = newUsername;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            setTimeout(() => loadAccountProfile(), 1000);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating username:', error);
        showMessageModal('Error updating username', 'error');
    }
}

async function handleUpdatePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordProfile').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const passwordHint = document.getElementById('passwordHintProfile').value;
    if (!currentPassword) { showMessageModal('Please enter your current password', 'warning'); return; }
    if (!newPassword) { showMessageModal('Please enter a new password', 'warning'); return; }
    if (newPassword.length < 6) { showMessageModal('New password must be at least 6 characters', 'warning'); return; }
    if (newPassword !== confirmPassword) { showMessageModal('New passwords do not match', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-password`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ currentPassword, newPassword, passwordHint })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Password changed successfully!', 'success');
            document.getElementById('updatePasswordForm').reset();
            document.getElementById('profilePasswordStrengthBar').className = 'password-strength-bar';
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showMessageModal('Error updating password', 'error');
    }
}

async function handleModalUpdateUsername() {
    const newUsername = document.getElementById('newUsernameModal').value.trim();
    const password = document.getElementById('usernamePasswordConfirm').value;
    if (!newUsername) { showMessageModal('Please enter a new username', 'warning'); return; }
    if (newUsername.length < 3) { showMessageModal('Username must be at least 3 characters', 'warning'); return; }
    if (!password) { showMessageModal('Please enter your password to confirm', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-username`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ newUsername, password })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Username updated successfully! Please login again.', 'success');
            currentUser.username = newUsername;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeModal('usernameModal');
            setTimeout(() => loadAccountProfile(), 1000);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating username:', error);
        showMessageModal('Error updating username', 'error');
    }
}

async function handleModalUpdatePassword() {
    const currentPassword = document.getElementById('currentPasswordModal').value;
    const newPassword = document.getElementById('newPasswordModal').value;
    const confirmPassword = document.getElementById('confirmPasswordModal').value;
    const passwordHint = document.getElementById('passwordHintModal').value;
    if (!currentPassword) { showMessageModal('Please enter your current password', 'warning'); return; }
    if (!newPassword) { showMessageModal('Please enter a new password', 'warning'); return; }
    if (newPassword.length < 6) { showMessageModal('New password must be at least 6 characters', 'warning'); return; }
    if (newPassword !== confirmPassword) { showMessageModal('New passwords do not match', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-password`, {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify({ currentPassword, newPassword, passwordHint })
        });
        const result = await response.json();
        if (result.success) {
            showMessageModal('Password changed successfully!', 'success');
            closeModal('passwordModal');
            document.getElementById('changePasswordForm').reset();
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showMessageModal('Error updating password', 'error');
    }
}

function openProfileModal(action) { 
   
    switch(action) {
        case 'fullname':
            // Populate existing values 
            const firstName = document.getElementById('profileFirstName').textContent;
            const middleName = document.getElementById('profileMiddleName').textContent;
            const lastName = document.getElementById('profileLastName').textContent;  

            console.log('first Name:', firstName) ;
            document.getElementById('editFirstName').value = firstName !== '-' ? firstName : '';
            document.getElementById('editMiddleName').value = middleName !== '-' ? middleName : '';
            document.getElementById('editLastName').value = lastName !== '-' ? lastName : '';
            document.getElementById('fullnameConfirmPassword').value = '';
            showModal('fullnameModal');
            break;
            
        case 'phone':
            const phone = document.getElementById('profilePhone').textContent;
            document.getElementById('editPhoneNumber').value = phone !== 'Not specified' ? phone : '';
            document.getElementById('phoneConfirmPassword').value = '';
            showModal('phoneModal');
            break;
            
        case 'username':
            document.getElementById('currentUsernameModal').value = currentUser.username;
            document.getElementById('newUsernameModal').value = '';
            document.getElementById('usernamePasswordConfirm').value = '';
            showModal('usernameModal');
            break;
            
        case 'password':
            document.getElementById('currentPasswordModal').value = '';
            document.getElementById('newPasswordModal').value = '';
            document.getElementById('confirmPasswordModal').value = '';
            document.getElementById('passwordHintModal').value = '';
            document.getElementById('modalPasswordStrengthBar').className = 'password-strength-bar';
            showModal('passwordModal');
            break;
            
        case 'security':
            loadSecuritySettings();
            showModal('securityModal');
            break;
    }
}
 
function loadSecuritySettings() {
    const loginNotifications = localStorage.getItem('loginNotifications') === 'true';
    const sessionTimeout = localStorage.getItem('sessionTimeout') || '30';
    document.getElementById('loginNotifications').checked = loginNotifications;
    document.getElementById('sessionTimeout').value = sessionTimeout;
}

function saveSecuritySettings() {
    const loginNotifications = document.getElementById('loginNotifications').checked;
    const sessionTimeout = document.getElementById('sessionTimeout').value;
    localStorage.setItem('loginNotifications', loginNotifications);
    localStorage.setItem('sessionTimeout', sessionTimeout);
    showMessageModal('Security settings saved successfully!', 'success');
    closeModal('securityModal');
}

function setup2FA() {
    showMessageModal('Two-factor authentication setup will be available soon.', 'info');
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    navigator.clipboard.writeText(text).then(() => showMessageModal('Copied to clipboard!', 'success')).catch(() => showMessageModal('Failed to copy', 'error'));
}

function checkModalPasswordStrength(password) {
    const bar = document.getElementById('modalPasswordStrengthBar');
    if (!bar) return;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    bar.className = 'password-strength-bar';
    if (strength <= 2) bar.classList.add('weak');
    else if (strength <= 4) bar.classList.add('medium');
    else bar.classList.add('strong');
}

function checkModalAddPasswordStrength(password) {
    const bar = document.getElementById('modalAddPasswordStrengthBar');
    if (!bar) return;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    bar.className = 'password-strength-bar';
    if (strength <= 2) bar.classList.add('weak');
    else if (strength <= 4) bar.classList.add('medium');
    else bar.classList.add('strong');
}

// ============================================
// INVOICE SUBMIT AND EDIT FUNCTIONS
// ============================================
async function handleSubmitInvoice(e) {
    e.preventDefault();
    const patientName = document.getElementById('patientName').value.trim();
    const gcrNumber = document.getElementById('gcrNumber').value.trim();
    const accountSelect = document.getElementById('accountSelect');
    const accountId = accountSelect.value;
    const priceInput = document.getElementById('price').value.trim();
    
    if (!patientName) { showMessageModal('Please enter patient name', 'warning'); return; }
    if (!gcrNumber || gcrNumber.length !== 8 || !/^\d{8}$/.test(gcrNumber)) { showMessageModal('Please enter a valid 8-digit GCR number (numbers only)', 'warning'); return; }
    if (!priceInput) { showMessageModal('Please enter an amount', 'warning'); return; }
    const amount = parseFloat(priceInput);
    if (isNaN(amount) || amount <= 0) { showMessageModal('Please enter a valid positive amount', 'warning'); return; }
    if (!accountId) { showMessageModal('Please select an account type', 'warning'); return; }
    
    const selectedServices = [];
    document.querySelectorAll('input[name="service"]:checked').forEach(cb => {
        selectedServices.push({ name: cb.value, price: parseFloat(cb.dataset.price) });
    });
    if (selectedServices.length === 0) { showMessageModal('Please select a service', 'warning'); return; }
    if (selectedServices.length > 1) { showMessageModal('Only one service can be selected per invoice', 'warning'); return; }
    
    const newInvoice = { patientName, gcrNumber, accountId: parseInt(accountId), services: selectedServices, amount: amount, createdBy: currentUser.username };
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, { method: 'POST', headers: getApiHeaders(), body: JSON.stringify(newInvoice) });
        const result = await response.json();
        if (result.success) {
            closeModal('invoiceModal');
            document.getElementById('invoiceForm').reset();
            const allCheckboxes = document.querySelectorAll('input[name="service"]');
            allCheckboxes.forEach(checkbox => { checkbox.disabled = false; checkbox.checked = false; checkbox.parentElement.style.opacity = '1'; checkbox.parentElement.style.cursor = 'pointer'; });
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

async function loadInvoiceForEdit(invoiceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, { headers: getApiHeaders() });
        const result = await response.json();
        if (result.success) {
            const invoice = result.data;
            document.getElementById('editInvoiceId').value = invoice.id;
            document.getElementById('editPatientName').value = invoice.patient_name;
            document.getElementById('editGcrNumber').value = invoice.gcr_number;
            await loadAccountsForEditSelect(invoice.account_id);
            displayServicesEdit(invoice.services);
            const subtotalField = document.getElementById('servicePrice');
            if (subtotalField && invoice.price) subtotalField.value = invoice.price.toFixed(2);
        }
    } catch (error) {
        console.error('Error loading invoice for edit:', error);
        showMessageModal('Error loading invoice details', 'error');
    }
}

function displayServicesEdit(invoiceServices) {
    const container = document.getElementById('editServicesReadOnly');
    if (!container) return;
    if (!invoiceServices || invoiceServices.length === 0) {
        container.innerHTML = '<div class="empty-state">No services associated with this invoice</div>';
        return;
    }
    fetch(`${API_BASE_URL}/services`, { headers: getApiHeaders() }).then(response => response.json()).then(result => {
        if (result.success) {
            const allAvailableServices = result.data;
            container.innerHTML = invoiceServices.map((invoiceService, index) => `
                <div class="service-item-edit" data-service-index="${index}">
                    <div style="flex:1;"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><i class="fas fa-stethoscope" style="color:var(--blue-600);"></i>
                    <select class="service-name-edit" data-service-index="${index}" style="padding:8px 12px;border-radius:8px;border:1px solid var(--gray-border);flex:1;min-width:150px;">
                        <option value="">Select Service</option>${allAvailableServices.map(availableService => `<option value="${escapeHtml(availableService.service_name)}" ${availableService.service_name === invoiceService.service_name ? 'selected' : ''}>${escapeHtml(availableService.service_name)}</option>`).join('')}
                    </select>
                    <div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;color:var(--gray-text);">GH¢</label>
                    <input type="text" class="service-price-edit" data-service-index="${index}" value="${(invoiceService.price || 0).toFixed(2)}" style="width:100px;padding:8px 12px;border-radius:8px;border:1px solid var(--gray-border);text-align:right;" onkeypress="return onlyNumbersAndDecimal(event)" oninput="validateAmount(this)"></div></div></div></div>
            `).join('');
            document.querySelectorAll('.service-name-edit').forEach(select => { select.addEventListener('change', function() { const index = parseInt(this.dataset.serviceIndex); const price = parseFloat(this.options[this.selectedIndex]?.dataset?.price) || 0; const priceInput = document.querySelector(`.service-price-edit[data-service-index="${index}"]`); if (priceInput) priceInput.value = price.toFixed(2); updateEditSubtotal(); }); });
            document.querySelectorAll('.service-price-edit').forEach(input => { input.addEventListener('input', () => updateEditSubtotal()); });
            updateEditSubtotal();
        }
    }).catch(error => { console.error('Error fetching services:', error); showMessageModal('Error loading services for editing', 'error'); });
}

function updateEditSubtotal() {
    const priceInputs = document.querySelectorAll('.service-price-edit');
    let subtotal = 0;
    priceInputs.forEach(input => { subtotal += parseFloat(input.value) || 0; });
    const subtotalField = document.getElementById('servicePrice');
    if (subtotalField) subtotalField.value = subtotal.toFixed(2);
}

async function handleEditInvoice(e) {
    e.preventDefault();
    const invoiceId = document.getElementById('editInvoiceId').value;
    const patientName = document.getElementById('editPatientName').value.trim();
    const gcrNumber = document.getElementById('editGcrNumber').value.trim();
    const accountId = document.getElementById('editAccountSelect').value;
    if (!patientName) 
       { 
            showMessageModal('Please enter patient name', 'warning'); 
            return; 
        };

    if (!gcrNumber || gcrNumber.length !== 8 || !/^\d{8}$/.test(gcrNumber)) { showMessageModal('Please enter a valid 8-digit GCR number (numbers only)', 'warning'); return; }
    if (!accountId) { showMessageModal('Please select an account type', 'warning'); return; }
    const selectedServices = [];
    document.querySelectorAll('.service-item-edit').forEach(item => { const select = item.querySelector('.service-name-edit'); const priceInput = item.querySelector('.service-price-edit'); if (select && select.value && priceInput) { selectedServices.push({ name: select.value, price: parseFloat(priceInput.value) || 0 }); } });
    if (selectedServices.length === 0) { showMessageModal('Please add at least one service', 'warning'); return; }
    const subtotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    const updatedInvoice = { patientName, gcrNumber, accountId: parseInt(accountId), services: selectedServices, amount: subtotal, updatedBy: currentUser.username };
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, { method: 'PUT', headers: getApiHeaders(), body: JSON.stringify(updatedInvoice) });
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

// ============================================
// PRINT AND EXPORT FUNCTIONS
// ============================================
function getCurrentFilteredInvoices() {
    const accountType = document.getElementById('filterAccountType')?.value || 'all';
    const serviceName = document.getElementById('filterService')?.value || 'all';
    const searchTerm = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    const dateFrom = currentDateRange?.from || null;
    const dateTo = currentDateRange?.to || null;
    let filtered = [...allInvoices];
    if (dateFrom || dateTo) {
        filtered = filtered.filter(inv => {
            const invDate = new Date(inv.timestamp);
            if (dateFrom && dateTo) { const fromDate = new Date(dateFrom); const toDate = new Date(dateTo); toDate.setHours(23, 59, 59, 999); return invDate >= fromDate && invDate <= toDate; }
            else if (dateFrom) { const fromDate = new Date(dateFrom); return invDate >= fromDate; }
            else if (dateTo) { const toDate = new Date(dateTo); toDate.setHours(23, 59, 59, 999); return invDate <= toDate; }
            return true;
        });
    }
    if (accountType !== 'all') filtered = filtered.filter(inv => inv.account_name === accountType);
    if (serviceName !== 'all') filtered = filtered.filter(inv => inv.services?.some(s => (s.service_name || s.name) === serviceName));
    if (searchTerm) filtered = filtered.filter(inv => inv.patient_name.toLowerCase().includes(searchTerm) || inv.gcr_number.includes(searchTerm));
    return filtered;
}

function buildPrintServicesList(invoices) {
    const serviceMap = new Map();
    invoices.forEach(invoice => { if (invoice.services && invoice.services.length > 0) { invoice.services.forEach(service => { const serviceName = service.service_name || service.name; if (!serviceMap.has(serviceName)) serviceMap.set(serviceName, { name: serviceName, price: service.price || 0 }); }); } });
    return Array.from(serviceMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function renderPrintTable(invoices) {
    const container = document.getElementById('printTableContainer');
    const recordCountSpan = document.getElementById('printRecordCount');
    const grandTotalSpan = document.getElementById('printGrandTotal');
    if (!container) return;
    container.innerHTML = '';
    if (!invoices || invoices.length === 0) { container.innerHTML = '<div class="empty-state" style="text-align:center;padding:60px;">No records to display</div>'; if (recordCountSpan) recordCountSpan.textContent = '0 Records'; if (grandTotalSpan) grandTotalSpan.textContent = 'GH¢0.00'; return; }
    const uniqueServices = buildPrintServicesList(invoices);
    const serviceTotals = new Map();
    uniqueServices.forEach(service => serviceTotals.set(service.name, 0));
    let grandTotal = 0;
    invoices.forEach(invoice => { grandTotal += invoice.price || 0; if (invoice.services && invoice.services.length > 0) { invoice.services.forEach(service => { const serviceName = service.service_name || service.name; const servicePrice = service.price || 0; if (serviceTotals.has(serviceName)) serviceTotals.set(serviceName, serviceTotals.get(serviceName) + servicePrice); }); } });
    let html = `<div class="print-table-responsive"><table class="print-table" style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--gray-border);"><thead><tr style="background:var(--gray-light);border-bottom:2px solid var(--gray-border);"><th style="padding:12px 10px;text-align:left;font-weight:600;border-right:1px solid var(--gray-border);">Date & Time</th><th style="padding:12px 10px;text-align:left;font-weight:600;border-right:1px solid var(--gray-border);">Name</th><th style="padding:12px 10px;text-align:left;font-weight:600;border-right:1px solid var(--gray-border);">GCR #</th><th style="padding:12px 10px;text-align:left;font-weight:600;border-right:1px solid var(--gray-border);">Account</th>`;
    uniqueServices.forEach((service) => { html += `<th style="padding:12px 10px;text-align:center;font-weight:600;border-right:1px solid var(--gray-border);">${escapeHtml(service.name)}</th>`; });
    html += `<th style="padding:12px 10px;text-align:right;font-weight:600;">Amount (GH¢)</th></tr></thead><tbody>`;
    invoices.forEach((invoice, rowIndex) => {
        const invoiceServiceMap = new Map();
        if (invoice.services && invoice.services.length > 0) { invoice.services.forEach(service => { const serviceName = service.service_name || service.name; invoiceServiceMap.set(serviceName, service.price || 0); }); }
        const isDrugsAccount = invoice.account_name === 'Drugs Account' || invoice.account_type === 'drugs';
        const accountLabel = isDrugsAccount ? 'Drugs' : 'Non-Drugs';
        const badgeStyle = isDrugsAccount ? 'background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block;' : 'background:#fed7aa;color:#92400e;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block;';
        const rowBgColor = rowIndex % 2 === 0 ? 'background:var(--white);' : 'background:var(--gray-light);';
        html += `<tr style="${rowBgColor} border-bottom:1px solid var(--gray-border);"><td style="padding:10px 10px;border-right:1px solid var(--gray-border);">${new Date(invoice.timestamp).toLocaleString()}</td><td style="padding:10px 10px;border-right:1px solid var(--gray-border);"><strong>${escapeHtml(invoice.patient_name)}</strong></td><td style="padding:10px 10px;border-right:1px solid var(--gray-border);font-family:monospace;">${invoice.gcr_number}</td><td style="padding:10px 10px;border-right:1px solid var(--gray-border);"><span style="${badgeStyle}">${escapeHtml(accountLabel)}</span></td>`;
        uniqueServices.forEach(service => {
            const hasService = invoiceServiceMap.has(service.name);
            if (hasService) { const servicePrice = invoiceServiceMap.get(service.name); html += `<td style="padding:10px 10px;text-align:center;border-right:1px solid var(--gray-border);"><span style="color:#10b981;font-size:16px;font-weight:bold;display:inline-block;">✓</span><small style="display:block;font-size:10px;color:var(--blue-600);">GH¢${servicePrice.toFixed(2)}</small></td>`; }
            else { html += `<td style="padding:10px 10px;text-align:center;border-right:1px solid var(--gray-border);"><span style="color:#ef4444;font-size:16px;font-weight:bold;">✗</span></td>`; }
        });
        html += `<td style="padding:10px 10px;text-align:right;font-weight:bold;">${(invoice.price || 0).toFixed(2)}</td></tr>`;
    });
    html += `</tbody><tfoot><tr style="background:#eef2ff;font-weight:bold;border-top:2px solid var(--blue-600);border-bottom:1px solid var(--blue-300);"><td colspan="4" style="padding:12px 10px;text-align:right;font-weight:bold;border-right:1px solid var(--gray-border);"><strong>SERVICE SUBTOTALS:</strong></td>`;
    uniqueServices.forEach(service => { const subtotal = serviceTotals.get(service.name) || 0; html += `<td style="padding:12px 10px;text-align:center;color:var(--blue-600);font-weight:bold;border-right:1px solid var(--gray-border);">GH¢${subtotal.toFixed(2)}</td>`; });
    html += `<td style="padding:12px 10px;text-align:right;"></td></tr><tr style="background:linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.1));font-weight:bold;border-top:2px solid var(--blue-600);border-bottom:2px solid var(--blue-600);"><td colspan="4" style="padding:12px 10px;text-align:right;font-weight:bold;font-size:14px;border-right:1px solid var(--gray-border);"><strong>GRAND TOTAL:</strong></td>`;
    uniqueServices.forEach(() => { html += `<td style="padding:12px 10px;text-align:center;"></td>`; });
    html += `<td style="padding:12px 10px;text-align:right;font-size:16px;color:var(--blue-700);"><strong>GH¢${grandTotal.toFixed(2)}</strong></td></tr></tfoot></table></div>`;
    container.innerHTML = html;
    if (recordCountSpan) recordCountSpan.textContent = `${invoices.length} Records`;
    if (grandTotalSpan) grandTotalSpan.textContent = `GH¢${grandTotal.toFixed(2)}`;
}

function openPrintModal() {
    if (isPrintModalOpen || isRenderingPrint) return;
    const filteredInvoices = getCurrentFilteredInvoices();
    if (filteredInvoices.length === 0) { showMessageModal('No records to display. Please adjust your filters.', 'warning'); return; }
    isPrintModalOpen = true; isRenderingPrint = true;
    const container = document.getElementById('printTableContainer');
    if (container) container.innerHTML = '<div style="text-align:center;padding:20px;">Loading...</div>';
    setTimeout(() => { try { renderPrintTable(filteredInvoices); isRenderingPrint = false; showModal('printModal'); } catch (error) { console.error('Error rendering print table:', error); isRenderingPrint = false; isPrintModalOpen = false; showMessageModal('Error loading print preview', 'error'); } }, 100);
}

function closePrintModal() { 
    closeModal('printModal');
    const container = document.getElementById('printTableContainer'); 
    if (container) container.innerHTML = '';
    isPrintModalOpen = false; 
    isRenderingPrint = false; 


}

function printPrintModal() {
    if (isPrinting) return;
    isPrinting = true;
    setTimeout(() => {
        window.onafterprint = function() { setTimeout(function() { closePrintModal(); isPrinting = false; window.onafterprint = null; }, 200); };
        window.print();
        setTimeout(function() { if (isPrinting) { closePrintModal(); isPrinting = false; window.onafterprint = null; } }, 5000);
    }, 200);
}

function exportToExcel() {
    const filteredInvoices = getCurrentFilteredInvoices();
    if (filteredInvoices.length === 0) { showMessageModal('No records to export. Please adjust your filters.', 'warning'); return; }
    const uniqueServices = buildPrintServicesList(filteredInvoices);
    const headers = ['Date & Time', 'Name', 'GCR Number', 'Account Type', ...uniqueServices.map(s => s.name), 'Total Amount (GH¢)'];
    const rows = filteredInvoices.map(invoice => {
        const invoiceServiceMap = new Map();
        if (invoice.services && invoice.services.length > 0) { invoice.services.forEach(service => { const serviceName = service.service_name || service.name; invoiceServiceMap.set(serviceName, service.price || 0); }); }
        return [new Date(invoice.timestamp).toLocaleString(), invoice.patient_name, invoice.gcr_number, invoice.account_name || invoice.account_type || 'N/A', ...uniqueServices.map(service => invoiceServiceMap.has(service.name) ? invoiceServiceMap.get(service.name).toFixed(2) : ''), (invoice.price || 0).toFixed(2)];
    });
    const serviceTotals = new Map();
    uniqueServices.forEach(service => serviceTotals.set(service.name, 0));
    let grandTotal = 0;
    filteredInvoices.forEach(invoice => { grandTotal += invoice.price || 0; if (invoice.services && invoice.services.length > 0) { invoice.services.forEach(service => { const serviceName = service.service_name || service.name; serviceTotals.set(serviceName, (serviceTotals.get(serviceName) || 0) + (service.price || 0)); }); } });
    const totalsRow = ['TOTAL', '', '', 'SERVICE SUBTOTALS:', ...uniqueServices.map(service => serviceTotals.get(service.name)?.toFixed(2) || '0.00'), grandTotal.toFixed(2)];
    const grandTotalRow = ['GRAND TOTAL', '', '', '', ...Array(uniqueServices.length).fill(''), grandTotal.toFixed(2)];
    const allRows = [headers, ...rows, totalsRow, grandTotalRow];
    const csvContent = allRows.map(row => row.map(cell => { if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) return `"${cell.replace(/"/g, '""')}"`; return cell; }).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', `WGMH_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);

    showMessageModal(`Exported ${filteredInvoices.length} records to Excel/CSV successfully!`, 'success');
}

// ============================================
// MODAL FUNCTIONS FOR ADDING ACCOUNTS, SERVICES, USERS
// ============================================
function openAddAccountModal() { 
    document.getElementById('addAccountForm').reset(); 
    showModal('addAccountModal'); 
}

function openAddServiceModal() { 
    document.getElementById('addServiceForm').reset(); 
    showModal('addServiceModal');

}


async function openAddUserModal() { 
    document.getElementById('addUserForm').reset(); 
    const strengthBar = document.getElementById('modalAddPasswordStrengthBar'); 
    if (strengthBar) strengthBar.className = 'password-strength-bar'; 
    await loadServicesForUserSelect(); 
    showModal('addUserModal'); 

}

async function handleModalAddAccount(e) {
    e.preventDefault();
    const accountName = document.getElementById('modalAccountName').value.trim();
    const accountType = document.getElementById('modalAccountTypeSelect').value;
    const description = document.getElementById('modalAccountDescription').value.trim();
    if (!accountName) { showMessageModal('Please enter account name', 'warning'); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, { 
            method: 'POST', headers: getApiHeaders(), 
            body: JSON.stringify({ accountName, accountType, description, createdBy: currentUser.username }) 
        });
        const result = await response.json();

        if (result.success) { 
            showMessageModal('Account added successfully!', 'success'); 
            closeModal('addAccountModal');
            document.getElementById('addAccountForm').reset(); 
            loadAccounts();
            loadAccountsForSelect(); 
            logActivity(`Added new account: ${accountName}`); 
        }
        else { 
            showMessageModal('Error: ' + result.error, 'error');
         }
    } catch (error) { 
        console.error('Error adding account:', error); 
        showMessageModal('Error adding account', 'error');
     }
}

async function handleModalAddService(e) {
    e.preventDefault();
    const serviceName = document.getElementById('modalServiceName').value.trim();
    const description = document.getElementById('modalServiceDescription').value.trim();
    const defaultPrice = document.getElementById('modalServicePrice').value.trim();
    if (!serviceName) { showMessageModal('Please enter service name', 'warning'); return; }
    const serviceData = { serviceName, description, createdBy: currentUser.username };
    if (defaultPrice) { const price = parseFloat(defaultPrice); if (!isNaN(price) && price > 0) serviceData.price = price; }
    try {
        const response = await fetch(`${API_BASE_URL}/services`, { method: 'POST', headers: getApiHeaders(), body: JSON.stringify(serviceData) });
        const result = await response.json();
        if (result.success) { showMessageModal('Service added successfully!', 'success'); closeModal('addServiceModal'); document.getElementById('addServiceForm').reset(); loadServicesList(); loadAllServicesForAssignment(); loadServicesForFilter(); logActivity(`Added new service: ${serviceName}`); }
        else { showMessageModal('Error: ' + result.error, 'error'); }
    } catch (error) { console.error('Error adding service:', error); showMessageModal('Error adding service', 'error'); }
}

// async function handleModalAddUser(e) {
//     e.preventDefault();
//     const firstName = document.getElementById('modalNewFirstName').value;
//     const middleName = document.getElementById('modalNewMiddleName').value;
//     const lastName = document.getElementById('modalNewLastName').value;
//     const Sex = document.getElementById('modalNewSex').value;
//     const DOB = document.getElementById('modalNewDob').value;
//     const phone = document.getElementById('modalNewPhone').value;
//     const username = document.getElementById('modalNewUsername').value.trim();
//     const password = document.getElementById('modalNewPassword').value;
//     const role = document.getElementById('modalUserRoleSelect').value;
//     const serviceId = document.getElementById('modalUserServicesListSelect').value;
//     const passwordHint = document.getElementById('modalPasswordHint').value;
//     if (!username) { showMessageModal('Please enter username', 'warning'); return; }
//     if (username.length < 3) { showMessageModal('Username must be at least 3 characters', 'warning'); return; }
//     if (!password) { showMessageModal('Please enter password', 'warning'); return; }
//     if (password.length < 6) { showMessageModal('Password must be at least 6 characters', 'warning'); return; }
//     const userServices = serviceId ? [parseInt(serviceId)] : [];
//     try {
//         const response = await fetch(`${API_BASE_URL}/users`, { method: 'POST', headers: getApiHeaders(), body: JSON.stringify({ firstName, middleName, lastName, Sex, DOB, phone, username, password, role, userServices, passwordHint, createdBy: currentUser.username }) });
//         const result = await response.json();
//         if (result.success) { 
//             showMessageModal(`User "${username}" added successfully!`, 'success');
//              closeModal('addUserModal');
//               document.getElementById('addUserForm').reset();
//                loadUsers(); 
//                loadUsersForServiceAssignment();
//                logActivity(`Added new user: ${username} with role: ${role}`);
//              }
//         else { 
//              showMessageModal('Error: ' + result.error, 'error'); 
//             }
//     } catch (error) { 
//         console.error('Error adding user:', error); 
//         showMessageModal('Error adding user', 'error');
//      }
// } 

async function handleModalAddUser(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('modalNewFirstName').value;
    const middleName = document.getElementById('modalNewMiddleName').value;
    const lastName = document.getElementById('modalNewLastName').value;
    const Sex = document.getElementById('modalNewSex').value;
    const DOB = document.getElementById('modalNewDob').value;
    const phone = document.getElementById('modalNewPhone').value;
    const username = document.getElementById('modalNewUsername').value.trim();
    const password = document.getElementById('modalNewPassword').value;
    const role = document.getElementById('modalUserRoleSelect').value;
    const passwordHint = document.getElementById('modalPasswordHint').value;
    
    // Get selected services from checkboxes
    const selectedServices = getSelectedServices();
    
    // Validations
    if (!username) { 
        showMessageModal('Please enter username', 'warning'); 
        return; 
    }
    if (username.length < 3) { 
        showMessageModal('Username must be at least 3 characters', 'warning'); 
        return; 
    }
    if (!password) { 
        showMessageModal('Please enter password', 'warning'); 
        return; 
    }
    if (password.length < 6) { 
        showMessageModal('Password must be at least 6 characters', 'warning'); 
        return; 
    }
    
    // Validate phone number
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
        showMessageModal('Please enter a valid 10-digit phone number', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, { 
            method: 'POST', 
            headers: getApiHeaders(), 
            body: JSON.stringify({ 
                firstName, 
                middleName, 
                lastName, 
                Sex, 
                DOB, 
                phone, 
                username, 
                password, 
                role, 
                userServices: selectedServices, 
                passwordHint, 
                createdBy: currentUser.username 
            }) 
        });
        
        const result = await response.json();
        
        if (result.success) { 
            showMessageModal(`User "${username}" added successfully with ${selectedServices.length} service(s)!`, 'success');
            closeModal('addUserModal');
            document.getElementById('addUserForm').reset();
            loadUsers(); 
            loadUsersForServiceAssignment();
            logActivity(`Added new user: ${username} with role: ${role} and ${selectedServices.length} services`);
        } else { 
            showMessageModal('Error: ' + result.error, 'error'); 
        }
    } catch (error) { 
        console.error('Error adding user:', error); 
        showMessageModal('Error adding user', 'error');
    }
}

// ============================================
// DELETE FUNCTIONS
// ============================================
window.editInvoice = async function(id) { 
    if (!hasPermission.canEditInvoice()) { 
        showMessageModal('Only admin can edit invoices', 'warning'); 
        return; } 
        await loadInvoiceForEdit(id); showModal('editInvoiceModal'); 
   };


window.deleteInvoice = async function(id) { 
    if (!hasPermission.canDeleteUser()) { 
        showMessageModal('Only admin can delete invoices', 'warning'); 
        return; 
    } 
    showConfirmModal('Are you sure you want to delete this invoice?', async () => { 
        try {
             const response = await fetch(`${API_BASE_URL}/invoices/${id}`,
                 { method: 'DELETE', 
                    headers: getApiHeaders(), 
                    body: JSON.stringify({ deletedBy: currentUser.username }) 
                }); 
             const result = await response.json(); 
             if (result.success) {
                 loadInvoices(); 
                 loadSummary(); 
                 showMessageModal('Invoice deleted successfully', 'success'); logActivity(`Deleted invoice #${id}`); 
                } else { 
                    showMessageModal('Error: ' + result.error, 'error'); 
                } 
            } catch (error) { 
                console.error('Error deleting invoice:', error); 
                showMessageModal('Error deleting invoice', 'error');
             } 
            }); 
        };


window.deleteAccount = async function(id) {
        showConfirmModal('Delete this account?', async () => { 
        try { 
            const response = await fetch(`${API_BASE_URL}/accounts/${id}`, 
                { method: 'DELETE', 
                    headers: getApiHeaders(),
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
                        console.error('Error deleting account:', error); showMessageModal('Error deleting account', 'error');
                        } 
                    }); 
}; 


window.deleteService = async function(id) { 
    showConfirmModal('Delete this service?', async () => {
         try { 
            const response = await fetch(`${API_BASE_URL}/services/${id}`, 
                { method: 'DELETE', 
                  headers: getApiHeaders(), 
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


// // Edit account function
// window.editAccount = async function(id) {
//     const account = accounts.find(a => a.id === id);
//     if (!account) return;
     

//     console.log("Account to edit details:" , account)
//     // Populate edit modal
//     document.getElementById('modalAccountName').value = account.account_name;
//     document.getElementById('modalAccountDescription').value = account.description || '';
//     document.getElementById('modalAccountTypeSelect').value = account.account_type;
     
//     // Change form submission to update mode
//     const addForm = document.getElementById('addAccountForm');
//     const originalSubmit = addForm.onsubmit;
    
//     addForm.onsubmit = async (e) => {
//         e.preventDefault();
//         await updateAccount(account.id);
//     };
    
//     showModal('EditAccountModal');
    
//     // Restore original submit after modal closes
//     const modal = document.getElementById('EditAccountModal');
//     const observer = new MutationObserver((mutations) => {
//         if (!modal.classList.contains('active')) {
//             addForm.onsubmit = originalSubmit;
//             observer.disconnect();
//         }
//     });
//     observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
// };


// GH1700 
// 3MONTHS



// ============================================
// MOBILE SIDEBAR FUNCTIONALITY
// ============================================

function closeMobileSidebar() { 
    
    if (window.innerWidth <= 992) { sidebar.classList.remove('mobile-open'); document.body.classList.remove('sidebar-open'); if (sidebarOverlay) sidebarOverlay.classList.remove('active'); } 


}

function openMobileSidebar() {
    if (window.innerWidth <= 992) { sidebar.classList.add('mobile-open'); document.body.classList.add('sidebar-open'); if (sidebarOverlay) sidebarOverlay.classList.add('active'); } 

}


if (mobileMenuToggle) { 
    
    mobileMenuToggle.addEventListener('click', (e) => { e.stopPropagation(); if (sidebar.classList.contains('mobile-open')) closeMobileSidebar(); else openMobileSidebar(); });

}


if (sidebarOverlay) { 
    sidebarOverlay.addEventListener('click', closeMobileSidebar);  

}
const allNavItems = document.querySelectorAll('.nav-item');


allNavItems.forEach(item => { 
    item.removeEventListener('click', closeMobileSidebarHandler); item.addEventListener('click', closeMobileSidebarHandler); 
});


function closeMobileSidebarHandler() { 
    if (window.innerWidth <= 992) { setTimeout(() => { closeMobileSidebar(); }, 150); } 

}
const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');

if (logoutBtnSidebar) { 
    logoutBtnSidebar.addEventListener('click', () => { if (window.innerWidth <= 992) { setTimeout(() => { closeMobileSidebar(); }, 150); } }); 
}
window.addEventListener('resize', () => { 
    if (window.innerWidth > 992) { sidebar.classList.remove('mobile-open'); document.body.classList.remove('sidebar-open'); if (sidebarOverlay) sidebarOverlay.classList.remove('active'); } 
}); 

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && window.innerWidth <= 992 && sidebar.classList.contains('mobile-open')) { closeMobileSidebar(); } 
}); 

if (sidebar) { 
    sidebar.addEventListener('click', (e) => { e.stopPropagation(); });
 
}  


// Make openServiceAssignmentModal globally available
window.openServiceAssignmentModal = async function(userId, fullName, staffId, username, phone) {
    selectedUserIdForServices = userId;
    
    // Set modal info
    const modalUserName = document.getElementById('modalUserName');
    const modalUserId = document.getElementById('modalUserId');
    const modalStaffId = document.getElementById('modalStaffId');
    const modalUsername = document.getElementById('modalUsername');
    const modalPhone = document.getElementById('modalPhone');
    
    if (modalUserName) modalUserName.textContent = fullName;
    if (modalUserId) modalUserId.value = userId;
    if (modalStaffId) modalStaffId.textContent = staffId?.substring(0, 8) || 'N/A';
    if (modalUsername) modalUsername.textContent = username;
    if (modalPhone) modalPhone.textContent = phone || 'Not provided';
    
    // Show modal
    showModal('serviceAssignmentModal');
    
    // Load services
    await loadAllServicesForAssignmentModal();
    await loadUserAssignedServicesDataModal(userId);
};

// Make closeServiceAssignmentModal globally available
window.closeServiceAssignmentModal = function() {
    closeModal('serviceAssignmentModal');
    selectedUserIdForServices = null;
    availableServicesFilter = '';
    assignedServicesFilter = '';
    
    // Clear search inputs
    const availableSearch = document.getElementById('availableServicesSearch');
    const assignedSearch = document.getElementById('assignedServicesSearch');
    if (availableSearch) availableSearch.value = '';
    if (assignedSearch) assignedSearch.value = '';
    
    // Refresh users table to show updated service counts
    renderUsersTable(allUsersList);
};

// ============================================
// GLOBAL FUNCTIONS EXPOSED
// ============================================
window.switchSection = switchSection;
window.editInvoice = editInvoice;
window.deleteInvoice = deleteInvoice;
window.deleteAccount = deleteAccount;
window.deleteService = deleteService;
window.assignServiceToUser = assignServiceToUser;
window.removeUserService = removeUserService;
window.loadUserServices = loadUserServices;
window.editUser = editUser;
window.changeUserPassword = changeUserPassword;
window.toggleUserBlock = toggleUserBlock;
window.suspendUser = suspendUser;
window.deleteUser = deleteUser;
window.unsuspendUser = unsuspendUser;
window.printPrintModal = printPrintModal;
window.openPrintModal = openPrintModal;
window.closePrintModal = closePrintModal;
window.exportToExcel = exportToExcel;
window.switchInvoiceView = switchInvoiceView;
window.firstServiceColumnsPage = firstServiceColumnsPage;
window.prevServiceColumnsPage = prevServiceColumnsPage;
window.nextServiceColumnsPage = nextServiceColumnsPage;
window.lastServiceColumnsPage = lastServiceColumnsPage;
window.goToServiceColumnsPage = goToServiceColumnsPage;
window.openAddAccountModal = openAddAccountModal;
window.openAddServiceModal = openAddServiceModal;
window.openAddUserModal = openAddUserModal;
window.openProfileModal = openProfileModal;
window.saveSecuritySettings = saveSecuritySettings;
window.setup2FA = setup2FA;
window.copyToClipboard = copyToClipboard;
window.checkModalPasswordStrength = checkModalPasswordStrength;
window.checkModalAddPasswordStrength = checkModalAddPasswordStrength;
window.onlyNumbers = onlyNumbers;
window.onlyNumbersAndDecimal = onlyNumbersAndDecimal;
window.validateGCRNumber = validateGCRNumber;
window.validateAmount = validateAmount; 




