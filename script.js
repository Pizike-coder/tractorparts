// Google Sheets URL - Multiple formats to try
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4gd43143RZ2t41DAzU9CNiZC5_lzzq1T116ZEciAFhR8mDz2tim1zM-4ZSCEC5I8Sy1ak5Xi_pJIc/pub?output=csv';
const SHEETS_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4gd43143RZ2t41DAzU9CNiZC5_lzzq1T116ZEciAFhR8mDz2tim1zM-4ZSCEC5I8Sy1ak5Xi_pJIc/pubhtml';
// CORS proxy as fallback (using a free public CORS proxy)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// EmailJS Configuration (You'll need to set this up)
// For now, using a placeholder - you'll need to:
// 1. Sign up at https://www.emailjs.com/
// 2. Create an email service
// 3. Get your User ID, Service ID, and Template ID
// 4. Replace the values below
const EMAILJS_CONFIG = {
    USER_ID: '55ea5oCTorstuLBY4', // Replace with your EmailJS User ID
    SERVICE_ID: 'service_1rcr388', // Replace with your EmailJS Service ID
    TEMPLATE_ID: 'MF tooted netis' // Replace with your EmailJS Template ID
};

let tableData = [];
let selectedRows = new Set();

// Initialize EmailJS (will only work after you configure it)
if (EMAILJS_CONFIG.USER_ID !== 'YOUR_USER_ID') {
    emailjs.init(EMAILJS_CONFIG.USER_ID);
}

// Load data from Google Sheets
async function loadData() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const tableBody = document.getElementById('tableBody');

    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';

        let rows = null;
        let error = null;

        // Try method 1: Direct CSV fetch
        try {
            const response = await fetch(SHEETS_CSV_URL);
            if (response.ok) {
                const csvText = await response.text();
                rows = parseCSV(csvText);
            }
        } catch (e) {
            console.log('Direct fetch failed, trying CORS proxy...', e);
            error = e;
        }

        // Try method 2: CORS proxy with CSV
        if (!rows) {
            try {
                const proxyUrl = CORS_PROXY + encodeURIComponent(SHEETS_CSV_URL);
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const csvText = await response.text();
                    rows = parseCSV(csvText);
                }
            } catch (e) {
                console.log('CORS proxy CSV failed, trying HTML parsing...', e);
                error = e;
            }
        }

        // Try method 3: Parse HTML table
        if (!rows) {
            try {
                const proxyUrl = CORS_PROXY + encodeURIComponent(SHEETS_HTML_URL);
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const htmlText = await response.text();
                    rows = parseHTMLTable(htmlText);
                }
            } catch (e) {
                console.log('HTML parsing failed', e);
                error = e;
            }
        }

        if (!rows || rows.length === 0) {
            throw new Error('Failed to load data from Google Sheets. ' + (error ? error.message : ''));
        }

        // Filter rows 1-2000 and columns A, B, C, D (indices 0-3)
        // Skip header row if present
        const startIndex = rows[0] && (rows[0][0] === 'Column A' || rows[0][0].toLowerCase().includes('column')) ? 1 : 0;
        tableData = rows
            .slice(startIndex, startIndex + 2000) // Rows 1-2000
            .map((row, index) => ({
                rowNumber: startIndex + index + 1,
                colA: (row[0] || '').trim(),
                colB: (row[1] || '').trim(),
                colC: (row[2] || '').trim(),
                colD: (row[3] || '').trim()
            }))
            .filter(row => row.colA || row.colB || row.colC || row.colD); // Remove completely empty rows

        // Populate table
        tableBody.innerHTML = '';
        if (tableData.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5" style="text-align: center; padding: 20px;">No data available</td>';
            tableBody.appendChild(tr);
        } else {
            tableData.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <input type="checkbox" class="row-checkbox" data-index="${index}">
                    </td>
                    <td>${escapeHtml(row.colA)}</td>
                    <td>${escapeHtml(row.colB)}</td>
                    <td>${escapeHtml(row.colC)}</td>
                    <td>${escapeHtml(row.colD)}</td>
                `;
                tableBody.appendChild(tr);
            });

            // Add event listeners to checkboxes
            document.querySelectorAll('.row-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleCheckboxChange);
            });

            // Select all checkbox
            const selectAllCheckbox = document.getElementById('selectAll');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', handleSelectAll);
            }
        }

        loadingEl.style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.innerHTML = `
            <p><strong>Error loading data from Google Sheets.</strong></p>
            <p>${error.message}</p>
            <p style="margin-top: 10px;">
                <button onclick="loadData()" style="padding: 10px 20px; background: white; border: none; border-radius: 4px; cursor: pointer; color: #ff4444;">
                    Retry
                </button>
            </p>
        `;
    }
}

// Parse CSV text into array of arrays
function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];

    for (let line of lines) {
        if (line.trim() === '') continue;
        
        const row = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        result.push(row);
    }

    return result;
}

// Parse HTML table from Google Sheets pubhtml
function parseHTMLTable(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const table = doc.querySelector('table');
    
    if (!table) {
        throw new Error('No table found in HTML');
    }
    
    const rows = [];
    const tableRows = table.querySelectorAll('tr');
    
    tableRows.forEach(tr => {
        const row = [];
        const cells = tr.querySelectorAll('td, th');
        cells.forEach(cell => {
            row.push(cell.textContent.trim());
        });
        if (row.length > 0) {
            rows.push(row);
        }
    });
    
    return rows;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle individual checkbox change
function handleCheckboxChange(event) {
    const index = parseInt(event.target.dataset.index);
    if (event.target.checked) {
        selectedRows.add(index);
    } else {
        selectedRows.delete(index);
        document.getElementById('selectAll').checked = false;
    }
}

// Handle select all checkbox
function handleSelectAll(event) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = event.target.checked;
        const index = parseInt(checkbox.dataset.index);
        if (event.target.checked) {
            selectedRows.add(index);
        } else {
            selectedRows.delete(index);
        }
    });
}

// Open order modal when email is clicked
document.getElementById('emailContact').addEventListener('click', function(e) {
    e.preventDefault();
    if (selectedRows.size === 0) {
        alert('Please select at least one item before ordering.');
        return;
    }
    openOrderModal();
});

// Open order modal
function openOrderModal() {
    const modal = document.getElementById('orderModal');
    const selectedItemsList = document.getElementById('selectedItemsList');
    
    // Clear previous selections
    selectedItemsList.innerHTML = '';
    
    // Display selected items
    const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b);
    sortedIndices.forEach(index => {
        const row = tableData[index];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-item';
        itemDiv.innerHTML = `
            <strong>Row ${row.rowNumber}:</strong> 
            ${escapeHtml(row.colA)} | 
            ${escapeHtml(row.colB)} | 
            ${escapeHtml(row.colC)} | 
            ${escapeHtml(row.colD)}
        `;
        selectedItemsList.appendChild(itemDiv);
    });
    
    // Reset form
    document.getElementById('orderForm').reset();
    document.getElementById('formMessage').style.display = 'none';
    
    modal.style.display = 'block';
}

// Close modal
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('orderModal').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', function() {
    document.getElementById('orderModal').style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle form submission
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formMessage = document.getElementById('formMessage');
    const submitButton = document.querySelector('.btn-order');
    
    // Get form data
    const formData = {
        personName: document.getElementById('personName').value,
        companyName: document.getElementById('companyName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        emailAddress: document.getElementById('emailAddress').value,
        selectedItems: Array.from(selectedRows).sort((a, b) => a - b).map(index => {
            const row = tableData[index];
            return `Row ${row.rowNumber}: ${row.colA} | ${row.colB} | ${row.colC} | ${row.colD}`;
        })
    };
    
    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    try {
        // If EmailJS is configured, use it
        if (EMAILJS_CONFIG.USER_ID !== 'YOUR_USER_ID') {
            await emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                {
                    to_email: 'kaia@intrac.ee',
                    from_name: formData.personName,
                    from_email: formData.emailAddress,
                    company: formData.companyName,
                    phone: formData.phoneNumber,
                    items: formData.selectedItems.join('\n'),
                    message: `Order from ${formData.personName} (${formData.companyName})\n\nSelected Items:\n${formData.selectedItems.join('\n')}`
                }
            );
        } else {
            // Fallback: Use mailto link (less reliable but works without setup)
            const subject = encodeURIComponent(`Order from ${formData.personName}`);
            const body = encodeURIComponent(
                `Name: ${formData.personName}\n` +
                `Company: ${formData.companyName}\n` +
                `Phone: ${formData.phoneNumber}\n` +
                `Email: ${formData.emailAddress}\n\n` +
                `Selected Items:\n${formData.selectedItems.join('\n')}`
            );
            window.location.href = `mailto:kaia@intrac.ee?subject=${subject}&body=${body}`;
            
            // Show success message after a delay
            setTimeout(() => {
                showFormMessage('Order submitted successfully!', 'success');
                submitButton.disabled = false;
                submitButton.textContent = 'Order Now';
                // Reset form after 2 seconds
                setTimeout(() => {
                    document.getElementById('orderForm').reset();
                    document.getElementById('orderModal').style.display = 'none';
                }, 2000);
            }, 500);
            return;
        }
        
        // Success
        showFormMessage('Order submitted successfully! Email sent to kaia@intrac.ee', 'success');
        
        // Reset form after 2 seconds
        setTimeout(() => {
            document.getElementById('orderForm').reset();
            document.getElementById('orderModal').style.display = 'none';
            selectedRows.clear();
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('selectAll').checked = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error sending email:', error);
        showFormMessage('Error sending email. Please try again or contact us directly.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Order Now';
    }
});

// Show form message
function showFormMessage(message, type) {
    const formMessage = document.getElementById('formMessage');
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
}

// Auto-refresh data daily (every 24 hours)
setInterval(() => {
    loadData();
}, 24 * 60 * 60 * 1000);

// Load data on page load
loadData();
