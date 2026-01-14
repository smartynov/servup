// Main application JavaScript for Server Setup Generator

// Global state
let users = [];
let modules = [];
let userModal = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    userModal = new bootstrap.Modal(document.getElementById('userModal'));
    loadUsers();
    loadModules();
});

// ============================================================================
// User Management Functions
// ============================================================================

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users', 'danger');
    }
}

function renderUsers() {
    const container = document.getElementById('users-list');

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No users added yet</p></div>';
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-header">
                <div>
                    <div class="user-username">
                        <i class="fas fa-user"></i> ${escapeHtml(user.username)}
                    </div>
                    <div class="user-groups">
                        ${user.groups ? user.groups.split(',').map(g =>
                            `<span class="badge bg-secondary badge-group">${escapeHtml(g.trim())}</span>`
                        ).join('') : '<span class="text-muted">No groups</span>'}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userForm').reset();
    document.getElementById('user-id').value = '';
    userModal.show();
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-groups').value = user.groups;
    document.getElementById('user-ssh-keys').value = user.ssh_keys;

    userModal.show();
}

async function saveUser() {
    const userId = document.getElementById('user-id').value;
    const username = document.getElementById('user-username').value.trim();
    const groups = document.getElementById('user-groups').value.trim();
    const ssh_keys = document.getElementById('user-ssh-keys').value.trim();

    if (!username) {
        showAlert('Username is required', 'danger');
        return;
    }

    const data = { username, groups, ssh_keys };

    try {
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save user');
        }

        await loadUsers();
        userModal.hide();
        showAlert(`User ${userId ? 'updated' : 'created'} successfully`, 'success');
    } catch (error) {
        console.error('Error saving user:', error);
        showAlert(error.message, 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }

        await loadUsers();
        showAlert('User deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user', 'danger');
    }
}

// ============================================================================
// Module Management Functions
// ============================================================================

async function loadModules() {
    try {
        const response = await fetch('/api/modules');
        modules = await response.json();
        renderModules();
    } catch (error) {
        console.error('Error loading modules:', error);
        showAlert('Failed to load modules', 'danger');
    }
}

function renderModules() {
    const container = document.getElementById('modules-list');

    if (modules.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-puzzle-piece"></i><p>No modules available</p></div>';
        return;
    }

    const enabledModules = modules.filter(m => m.enabled);

    container.innerHTML = enabledModules.map(module => `
        <div class="module-item ${!module.enabled ? 'disabled' : ''}">
            <div class="module-header">
                <div class="module-checkbox">
                    <input type="checkbox" class="form-check-input" id="module-${module.id}"
                           data-module-id="${module.id}" ${!module.enabled ? 'disabled' : ''}>
                </div>
                <div class="module-info">
                    <label for="module-${module.id}" class="module-name cursor-pointer">
                        ${escapeHtml(module.name)}
                    </label>
                    <div class="module-description">${escapeHtml(module.description)}</div>
                    ${module.requires_input ? `
                        <div class="module-input" id="module-input-${module.id}" style="display: none;">
                            <label class="form-label">${escapeHtml(module.input_label)}</label>
                            <input type="text" class="form-control form-control-sm"
                                   id="module-input-value-${module.id}"
                                   placeholder="${escapeHtml(module.input_default)}"
                                   value="${escapeHtml(module.input_default)}">
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners for checkboxes
    enabledModules.forEach(module => {
        const checkbox = document.getElementById(`module-${module.id}`);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                if (module.requires_input) {
                    const inputDiv = document.getElementById(`module-input-${module.id}`);
                    inputDiv.style.display = this.checked ? 'block' : 'none';
                }
            });
        }
    });
}

// ============================================================================
// Script Generation Functions
// ============================================================================

async function generateScript() {
    // Collect selected users (all users are included)
    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
        showAlert('Please add at least one user', 'warning');
        return;
    }

    // Collect selected modules
    const moduleIds = [];
    const moduleInputs = {};

    modules.filter(m => m.enabled).forEach(module => {
        const checkbox = document.getElementById(`module-${module.id}`);
        if (checkbox && checkbox.checked) {
            moduleIds.push(module.id);

            if (module.requires_input) {
                const inputField = document.getElementById(`module-input-value-${module.id}`);
                if (inputField) {
                    moduleInputs[module.id] = inputField.value || module.input_default;
                }
            }
        }
    });

    if (moduleIds.length === 0) {
        showAlert('Please select at least one module', 'warning');
        return;
    }

    // Get system settings
    const hostname = document.getElementById('hostname').value.trim();
    const timezone = document.getElementById('timezone').value.trim() || 'UTC';

    const data = {
        name: `Configuration ${new Date().toLocaleString()}`,
        user_ids: userIds,
        module_ids: moduleIds,
        module_inputs: moduleInputs,
        hostname: hostname,
        timezone: timezone
    };

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate script');
        }

        const result = await response.json();
        displayScript(result);
        showAlert('Script generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating script:', error);
        showAlert(error.message, 'danger');
    }
}

function displayScript(result) {
    const outputSection = document.getElementById('output-section');
    const outputPlaceholder = document.getElementById('output-placeholder');
    const scriptContent = document.getElementById('script-content');
    const downloadUrl = document.getElementById('download-url');
    const curlCommand = document.getElementById('curl-command');

    // Update URLs (replace YOUR_SERVER with window.location.host)
    const serverUrl = window.location.origin;
    const fullDownloadUrl = `${serverUrl}/scripts/${result.hash}.sh`;
    const fullCurlCommand = `curl -sL ${fullDownloadUrl} | bash`;

    downloadUrl.value = fullDownloadUrl;
    curlCommand.value = fullCurlCommand;
    scriptContent.textContent = result.script;

    // Apply syntax highlighting
    hljs.highlightElement(scriptContent);

    // Show output section
    outputPlaceholder.style.display = 'none';
    outputSection.style.display = 'block';

    // Scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearForm() {
    if (!confirm('Are you sure you want to clear the form?')) return;

    // Clear system settings
    document.getElementById('hostname').value = '';
    document.getElementById('timezone').value = 'UTC';

    // Uncheck all modules
    modules.forEach(module => {
        const checkbox = document.getElementById(`module-${module.id}`);
        if (checkbox) {
            checkbox.checked = false;
            if (module.requires_input) {
                const inputDiv = document.getElementById(`module-input-${module.id}`);
                if (inputDiv) inputDiv.style.display = 'none';
            }
        }
    });

    // Hide output section
    document.getElementById('output-section').style.display = 'none';
    document.getElementById('output-placeholder').style.display = 'block';

    showAlert('Form cleared', 'info');
}

// ============================================================================
// Utility Functions
// ============================================================================

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(element.value).then(() => {
        showAlert('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showAlert('Failed to copy to clipboard', 'danger');
    });
}

function copyScript() {
    const scriptContent = document.getElementById('script-content').textContent;

    navigator.clipboard.writeText(scriptContent).then(() => {
        showAlert('Script copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showAlert('Failed to copy script', 'danger');
    });
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-slide-in`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
