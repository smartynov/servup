// History page JavaScript for viewing past configurations

let configurations = [];
let currentConfig = null;
let configModal = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    configModal = new bootstrap.Modal(document.getElementById('configModal'));
    loadConfigurations();
});

// ============================================================================
// Configuration History Functions
// ============================================================================

async function loadConfigurations() {
    try {
        const response = await fetch('/api/configurations');
        configurations = await response.json();
        renderHistory();
    } catch (error) {
        console.error('Error loading configurations:', error);
        showAlert('Failed to load configuration history', 'danger');
    }
}

function renderHistory() {
    const container = document.getElementById('history-list');

    if (configurations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No configurations saved yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = configurations.map(config => {
        const date = new Date(config.created_at);
        const dateStr = date.toLocaleString();

        return `
            <div class="history-item">
                <div class="history-header">
                    <div>
                        <div class="history-title">
                            ${config.name || 'Unnamed Configuration'}
                        </div>
                        <div class="history-date">
                            <i class="fas fa-clock"></i> ${dateStr}
                        </div>
                    </div>
                </div>
                <div class="history-meta">
                    <div class="history-meta-item">
                        <i class="fas fa-users"></i>
                        <span>${config.users.length} user(s)</span>
                    </div>
                    <div class="history-meta-item">
                        <i class="fas fa-puzzle-piece"></i>
                        <span>${config.modules.length} module(s)</span>
                    </div>
                    ${config.hostname ? `
                        <div class="history-meta-item">
                            <i class="fas fa-server"></i>
                            <span>${escapeHtml(config.hostname)}</span>
                        </div>
                    ` : ''}
                    <div class="history-meta-item">
                        <i class="fas fa-globe"></i>
                        <span>${escapeHtml(config.timezone)}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewConfiguration(${config.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-success" onclick="downloadScript('${config.hash}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-sm btn-info" onclick="copyConfigUrl('${config.hash}')">
                        <i class="fas fa-copy"></i> Copy URL
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteConfiguration(${config.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewConfiguration(configId) {
    try {
        const response = await fetch(`/api/configurations/${configId}`);
        currentConfig = await response.json();
        displayConfigurationModal(currentConfig);
    } catch (error) {
        console.error('Error loading configuration:', error);
        showAlert('Failed to load configuration details', 'danger');
    }
}

function displayConfigurationModal(config) {
    const serverUrl = window.location.origin;
    const scriptUrl = `${serverUrl}/scripts/${config.hash}.sh`;
    const curlCommand = `curl -sL ${scriptUrl} | bash`;

    // Basic info
    document.getElementById('config-name').textContent = config.name || 'Unnamed Configuration';
    document.getElementById('config-created').textContent = new Date(config.created_at).toLocaleString();
    document.getElementById('config-hostname').textContent = config.hostname || 'Not set';
    document.getElementById('config-timezone').textContent = config.timezone;

    // URLs
    document.getElementById('config-url').value = scriptUrl;
    document.getElementById('config-curl').value = curlCommand;

    // Users
    const usersHtml = config.users.length > 0
        ? `<ul class="list-group list-group-flush">
            ${config.users.map(user => `
                <li class="list-group-item">
                    <strong>${escapeHtml(user.username)}</strong>
                    ${user.groups ? `<br><small class="text-muted">Groups: ${escapeHtml(user.groups)}</small>` : ''}
                </li>
            `).join('')}
           </ul>`
        : '<p class="text-muted">No users</p>';
    document.getElementById('config-users').innerHTML = usersHtml;

    // Modules
    const modulesHtml = config.modules.length > 0
        ? `<ul class="list-group list-group-flush">
            ${config.modules.map(module => `
                <li class="list-group-item">
                    <strong>${escapeHtml(module.name)}</strong>
                    ${module.description ? `<br><small class="text-muted">${escapeHtml(module.description)}</small>` : ''}
                </li>
            `).join('')}
           </ul>`
        : '<p class="text-muted">No modules</p>';
    document.getElementById('config-modules').innerHTML = modulesHtml;

    // Script content
    const scriptContent = document.getElementById('config-script');
    scriptContent.textContent = config.script_content;
    hljs.highlightElement(scriptContent);

    configModal.show();
}

async function deleteConfiguration(configId) {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
        const response = await fetch(`/api/configurations/${configId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete configuration');
        }

        await loadConfigurations();
        showAlert('Configuration deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting configuration:', error);
        showAlert('Failed to delete configuration', 'danger');
    }
}

function downloadScript(hash) {
    const serverUrl = window.location.origin;
    const url = `${serverUrl}/scripts/${hash}.sh`;
    window.open(url, '_blank');
}

function copyConfigUrl(hash) {
    const serverUrl = window.location.origin;
    const url = `${serverUrl}/scripts/${hash}.sh`;

    navigator.clipboard.writeText(url).then(() => {
        showAlert('URL copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showAlert('Failed to copy URL', 'danger');
    });
}

function reuseConfiguration() {
    if (!currentConfig) return;

    // Store configuration in sessionStorage
    sessionStorage.setItem('reuseConfig', JSON.stringify(currentConfig));

    // Redirect to home page
    window.location.href = '/';
}

// Check if there's a configuration to reuse on page load
window.addEventListener('load', function() {
    const reuseConfig = sessionStorage.getItem('reuseConfig');
    if (reuseConfig) {
        try {
            const config = JSON.parse(reuseConfig);
            // TODO: Populate form with config data
            sessionStorage.removeItem('reuseConfig');
            showAlert('Configuration loaded', 'info');
        } catch (error) {
            console.error('Error loading reuse config:', error);
        }
    }
});

// ============================================================================
// Utility Functions
// ============================================================================

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(element.value).then(() => {
        showAlert('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showAlert('Failed to copy to clipboard', 'danger');
    });
}

function copyScript() {
    const scriptContent = document.getElementById('config-script').textContent;

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
