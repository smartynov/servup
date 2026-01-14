// Admin panel JavaScript for Module Management

let modules = [];
let moduleModal = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    moduleModal = new bootstrap.Modal(document.getElementById('moduleModal'));
    loadModules();
});

// ============================================================================
// Module Management Functions
// ============================================================================

async function loadModules() {
    try {
        const response = await fetch('/api/modules');
        modules = await response.json();
        renderModulesTable();
    } catch (error) {
        console.error('Error loading modules:', error);
        showAlert('Failed to load modules', 'danger');
    }
}

function renderModulesTable() {
    const tbody = document.getElementById('modules-table-body');

    if (modules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No modules found</td></tr>';
        return;
    }

    tbody.innerHTML = modules.map(module => `
        <tr class="${!module.enabled ? 'table-secondary' : ''}">
            <td>${module.priority}</td>
            <td>${escapeHtml(module.name)}</td>
            <td>${escapeHtml(module.description)}</td>
            <td>
                ${module.requires_input
                    ? `<i class="fas fa-check text-success"></i> ${escapeHtml(module.input_label)}`
                    : '<i class="fas fa-times text-muted"></i>'}
            </td>
            <td>${module.dependencies || '<span class="text-muted">None</span>'}</td>
            <td>
                ${module.enabled
                    ? '<span class="badge bg-success">Enabled</span>'
                    : '<span class="badge bg-secondary">Disabled</span>'}
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editModule(${module.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewModuleCode(${module.id})" title="View Code">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteModule(${module.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showAddModuleModal() {
    document.getElementById('moduleModalTitle').textContent = 'Add Module';
    document.getElementById('moduleForm').reset();
    document.getElementById('module-id').value = '';
    document.getElementById('module-priority').value = '100';
    document.getElementById('module-enabled').checked = true;
    moduleModal.show();
}

function editModule(moduleId) {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    document.getElementById('moduleModalTitle').textContent = 'Edit Module';
    document.getElementById('module-id').value = module.id;
    document.getElementById('module-name').value = module.name;
    document.getElementById('module-description').value = module.description;
    document.getElementById('module-bash-code').value = module.bash_code;
    document.getElementById('module-priority').value = module.priority;
    document.getElementById('module-enabled').checked = module.enabled;
    document.getElementById('module-dependencies').value = module.dependencies;
    document.getElementById('module-requires-input').checked = module.requires_input;
    document.getElementById('module-input-label').value = module.input_label;
    document.getElementById('module-input-default').value = module.input_default;

    moduleModal.show();
}

function viewModuleCode(moduleId) {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const codeContent = document.getElementById('view-code-content');
    codeContent.textContent = module.bash_code;

    const viewModal = new bootstrap.Modal(document.getElementById('viewCodeModal'));
    viewModal.show();
}

async function saveModule() {
    const moduleId = document.getElementById('module-id').value;
    const name = document.getElementById('module-name').value.trim();
    const description = document.getElementById('module-description').value.trim();
    const bash_code = document.getElementById('module-bash-code').value.trim();
    const priority = parseInt(document.getElementById('module-priority').value);
    const enabled = document.getElementById('module-enabled').checked;
    const dependencies = document.getElementById('module-dependencies').value.trim();
    const requires_input = document.getElementById('module-requires-input').checked;
    const input_label = document.getElementById('module-input-label').value.trim();
    const input_default = document.getElementById('module-input-default').value.trim();

    if (!name || !bash_code) {
        showAlert('Name and Bash Code are required', 'danger');
        return;
    }

    const data = {
        name,
        description,
        bash_code,
        priority,
        enabled,
        dependencies,
        requires_input,
        input_label,
        input_default
    };

    try {
        const url = moduleId ? `/api/modules/${moduleId}` : '/api/modules';
        const method = moduleId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save module');
        }

        await loadModules();
        moduleModal.hide();
        showAlert(`Module ${moduleId ? 'updated' : 'created'} successfully`, 'success');
    } catch (error) {
        console.error('Error saving module:', error);
        showAlert(error.message, 'danger');
    }
}

async function deleteModule(moduleId) {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    if (!confirm(`Are you sure you want to delete module "${module.name}"?`)) return;

    try {
        const response = await fetch(`/api/modules/${moduleId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete module');
        }

        await loadModules();
        showAlert('Module deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting module:', error);
        showAlert('Failed to delete module', 'danger');
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

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
