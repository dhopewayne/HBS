// Add to the section mapping in switchSection function
const sectionMap = {
    'dashboard': 'dashboardSection',
    'invoices': 'invoicesSection',
    'accounts': 'accountsSection',
    'services': 'servicesSection',
    'user-services': 'userServicesSection',
    'users': 'usersSection',
    'activity': 'activitySection',
    'account': 'accountSection'  // Add this line
};

// Add to sectionTitles object
const sectionTitles = {
    dashboard: 'Dashboard',
    invoices: 'Records Management',
    accounts: 'Account Management',
    services: 'Service Management',
    'user-services': 'User Service Assignments',
    users: 'User Management',
    activity: 'Activity Log',
    account: 'My Account'  // Add this line
};

// Load account profile data
async function loadAccountProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/current`, {
            headers: { 
                'X-User-Role': currentUser.role, 
                'X-Username': currentUser.username 
            }
        });
        const result = await response.json();
        
        if (result.success) {
            const user = result.data;
            
            // Update profile display
            document.getElementById('profileUsername').textContent = user.username;
            document.getElementById('profileAccountNumber').textContent = user.special_id || 'N/A';
            document.getElementById('profileRole').textContent = user.role.toUpperCase();
            document.getElementById('currentUsernameDisplay').value = user.username;
            
            // Set role badge class
            const roleBadge = document.getElementById('profileRole');
            roleBadge.className = `role-badge ${user.role}`;
            
            // Set status
            const statusBadge = document.getElementById('profileStatus');
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
            
            // Set member since
            if (user.created_at) {
                document.getElementById('profileMemberSince').textContent = new Date(user.created_at).toLocaleDateString();
            }
            
            // Load assigned services
            await loadProfileServices();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load assigned services for profile
async function loadProfileServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/my-services`, {
            headers: { 
                'X-User-Role': currentUser.role, 
                'X-Username': currentUser.username 
            }
        });
        const result = await response.json();
        
        const servicesContainer = document.getElementById('profileServices');
        if (result.success && result.data && result.data.length > 0) {
            servicesContainer.innerHTML = result.data.map(s => `
                <span class="service-tag">
                    <i class="fas fa-stethoscope"></i> ${escapeHtml(s.service_name)}
                </span>
            `).join('');
        } else {
            servicesContainer.innerHTML = '<span class="empty-text">No services assigned</span>';
        }
    } catch (error) {
        console.error('Error loading profile services:', error);
    }
}

// Update username from profile
async function handleUpdateUsername(e) {
    e.preventDefault();
    
    const newUsername = document.getElementById('newUsernameProfile').value.trim();
    const confirmPassword = document.getElementById('usernameConfirmPassword').value;
    
    if (!newUsername) {
        showMessageModal('Please enter a new username', 'warning');
        return;
    }
    
    if (newUsername.length < 3) {
        showMessageModal('Username must be at least 3 characters', 'warning');
        return;
    }
    
    if (!confirmPassword) {
        showMessageModal('Please enter your password to confirm', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-username`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ 
                newUsername, 
                password: confirmPassword 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessageModal('Username updated successfully! Please login again.', 'success');
            
            // Update current user in localStorage
            currentUser.username = newUsername;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Clear form
            document.getElementById('newUsernameProfile').value = '';
            document.getElementById('usernameConfirmPassword').value = '';
            
            // Reload profile
            setTimeout(() => {
                loadAccountProfile();
            }, 1000);
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating username:', error);
        showMessageModal('Error updating username', 'error');
    }
}

// Password strength checker for profile
function checkProfilePasswordStrength(password) {
    const bar = document.getElementById('profilePasswordStrengthBar');
    if (!bar) return;
    
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    bar.className = 'password-strength-bar';
    
    if (strength <= 2) {
        bar.classList.add('weak');
    } else if (strength <= 4) {
        bar.classList.add('medium');
    } else {
        bar.classList.add('strong');
    }
}

// Update password from profile
async function handleUpdatePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordProfile').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const passwordHint = document.getElementById('passwordHintProfile').value;
    
    if (!currentPassword) {
        showMessageModal('Please enter your current password', 'warning');
        return;
    }
    
    if (!newPassword) {
        showMessageModal('Please enter a new password', 'warning');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessageModal('New password must be at least 6 characters', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessageModal('New passwords do not match', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/update-profile-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': currentUser.role,
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ 
                currentPassword, 
                newPassword, 
                passwordHint 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessageModal('Password changed successfully!', 'success');
            
            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPasswordProfile').value = '';
            document.getElementById('confirmNewPassword').value = '';
            document.getElementById('passwordHintProfile').value = '';
            document.getElementById('profilePasswordStrengthBar').className = 'password-strength-bar';
        } else {
            showMessageModal('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showMessageModal('Error updating password', 'error');
    }
}

// Add event listeners for profile forms
function setupProfileEventListeners() {
    const updateUsernameForm = document.getElementById('updateUsernameForm');
    if (updateUsernameForm) {
        updateUsernameForm.addEventListener('submit', handleUpdateUsername);
    }
    
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', handleUpdatePassword);
    }
}

// Add account nav item to sidebar HTML and JavaScript