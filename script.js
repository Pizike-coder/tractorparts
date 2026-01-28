// Google Sheets URL - Multiple formats to try
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4gd43143RZ2t41DAzU9CNiZC5_lzzq1T116ZEciAFhR8mDz2tim1zM-4ZSCEC5I8Sy1ak5Xi_pJIc/pub?output=csv';
const SHEETS_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4gd43143RZ2t41DAzU9CNiZC5_lzzq1T116ZEciAFhR8mDz2tim1zM-4ZSCEC5I8Sy1ak5Xi_pJIc/pubhtml';
// Multiple CORS proxies as fallback
const CORS_PROXIES = [
    { url: 'https://api.allorigins.win/raw?url=', format: 'prepend' },
    { url: 'https://corsproxy.io/?', format: 'prepend' },
    { url: 'https://api.codetabs.com/v1/proxy?quest=', format: 'prepend' },
    { url: 'https://cors-anywhere.herokuapp.com/', format: 'prepend' }
];

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
let allTableData = []; // Store all data for search functionality
let filteredTableData = []; // Store filtered data
let columnHeaders = ['Column A', 'Column B', 'Column C', 'Column D']; // Store column headers

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
        let lastError = null;

        // Try method 1: Direct CSV fetch (with timeout)
        try {
            console.log('Trying direct CSV fetch...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(SHEETS_CSV_URL, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const csvText = await response.text();
                if (csvText && csvText.trim().length > 0 && csvText.includes(',')) {
                    rows = parseCSV(csvText);
                    if (rows && rows.length > 0) {
                        console.log('Direct CSV fetch successful!', rows.length, 'rows');
                    }
                } else {
                    console.log('Direct fetch returned empty or invalid CSV');
                }
            } else {
                console.log('Direct fetch response not OK:', response.status, response.statusText);
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Direct fetch timed out');
                lastError = new Error('Request timed out');
            } else {
                console.log('Direct fetch failed:', e.message);
                lastError = e;
            }
        }

        // Try method 2: CORS proxies with CSV
        if (!rows) {
            for (let i = 0; i < CORS_PROXIES.length && !rows; i++) {
                try {
                    console.log(`Trying CORS proxy ${i + 1} (${CORS_PROXIES[i].url}) with CSV...`);
                    const proxyUrl = CORS_PROXIES[i].url + encodeURIComponent(SHEETS_CSV_URL);
                    
                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: {
                            'Accept': 'text/csv'
                        }
                    });
                    
                    if (response.ok) {
                        const csvText = await response.text();
                        // Check if we got actual CSV data (not an error page)
                        if (csvText && csvText.trim().length > 0 && !csvText.includes('<html') && !csvText.includes('error')) {
                            rows = parseCSV(csvText);
                            if (rows && rows.length > 0) {
                                console.log(`CORS proxy ${i + 1} CSV successful!`, rows.length, 'rows');
                                break;
                            }
                        }
                    } else {
                        console.log(`CORS proxy ${i + 1} response not OK:`, response.status);
                    }
                } catch (e) {
                    console.log(`CORS proxy ${i + 1} CSV failed:`, e.message);
                    lastError = e;
                }
            }
        }

        // Try method 3: CORS proxies with HTML table
        if (!rows) {
            for (let i = 0; i < CORS_PROXIES.length && !rows; i++) {
                try {
                    console.log(`Trying CORS proxy ${i + 1} (${CORS_PROXIES[i].url}) with HTML...`);
                    const proxyUrl = CORS_PROXIES[i].url + encodeURIComponent(SHEETS_HTML_URL);
                    
                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache'
                    });
                    
                    if (response.ok) {
                        const htmlText = await response.text();
                        // Check if we got actual HTML with a table
                        if (htmlText && htmlText.includes('<table')) {
                            rows = parseHTMLTable(htmlText);
                            if (rows && rows.length > 0) {
                                console.log(`CORS proxy ${i + 1} HTML successful!`, rows.length, 'rows');
                                break;
                            }
                        }
                    } else {
                        console.log(`CORS proxy ${i + 1} HTML response not OK:`, response.status);
                    }
                } catch (e) {
                    console.log(`CORS proxy ${i + 1} HTML failed:`, e.message);
                    lastError = e;
                }
            }
        }

        if (!rows || rows.length === 0) {
            let errorMsg = 'Unable to fetch data... ';
            if (lastError) {
                errorMsg += `Error: ${lastError.message}. `;
            }
            errorMsg += 'Possible causes:\n';
            errorMsg += '1. The data may not be published\n';
            errorMsg += '2. CORS restrictions or network issues\n';
            errorMsg += '3. The sheet URL may have changed\n';
            errorMsg += 'Please check the browser console for more details.';
            throw new Error(errorMsg);
        }

        // Extract header row (first row) - always use first row as headers
        const headerRow = rows[0] || [];
        columnHeaders = [
            (headerRow[0] || 'Column A').trim(),
            (headerRow[1] || 'Column B').trim(),
            (headerRow[2] || 'Column C').trim(),
            (headerRow[3] || 'Column D').trim()
        ];

        // Update table header with column names from Google Sheets
        const tableHead = document.querySelector('#dataTable thead tr');
        if (tableHead) {
            tableHead.innerHTML = `
                <th></th>
                <th>${escapeHtml(columnHeaders[0])}</th>
                <th>${escapeHtml(columnHeaders[1])}</th>
                <th>${escapeHtml(columnHeaders[2])}</th>
                <th>${escapeHtml(columnHeaders[3])}</th>
            `;
            
            // Re-attach select all event listener
            const selectAllCheckbox = document.getElementById('selectAll');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', handleSelectAll);
            }
        }

        // Filter rows 2-2001 (skip first row which is header, then take next 2000 rows)
        // Columns A, B, C, D (indices 0-3)
        allTableData = rows
            .slice(1, 2001) // Skip first row (header), take rows 2-2001 (2000 rows)
            .map((row, index) => ({
                rowNumber: index + 2, // Row number in sheet (starting from 2, since row 1 is header)
                colA: (row[0] || '').trim(),
                colB: (row[1] || '').trim(),
                colC: (row[2] || '').trim(),
                colD: (row[3] || '').trim()
            }))
            .filter(row => row.colA || row.colB || row.colC || row.colD); // Remove completely empty rows
        
        // Initially, show all data
        filteredTableData = [...allTableData];
        tableData = filteredTableData;

        // Populate table body
        renderTable();
        
        // Populate SEO content for search engines
        populateSEOContent();

        loadingEl.style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        // Format error message with line breaks
        const errorLines = error.message.split('\n');
        const errorHTML = errorLines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
        
        errorEl.innerHTML = `
            <p><strong>Error loading data...</strong></p>
            ${errorHTML}
            <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
                <strong>Note:</strong> If you're opening this file directly (file://), try using a local web server instead.
                <br>You can use Python: <code>python -m http.server 8000</code> or install a simple HTTP server.
            </p>
            <p style="margin-top: 10px;">
                <button onclick="loadData()" style="padding: 10px 20px; background: white; border: none; border-radius: 4px; cursor: pointer; color: #ff4444; font-weight: 600;">
                    Retry
                </button>
                <button onclick="window.open('${SHEETS_CSV_URL}', '_blank')" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; font-weight: 600;">
                    Test URL
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

// Store item quantities for order form
let itemQuantities = new Map();

// Helper: parse numeric value (price or stock) from string
function parseNumberValue(value) {
    if (!value) return 0;
    const normalized = value.toString().replace(/[^0-9,.\-]/g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
}

// Update per-row totals and grand total in the order form
function updateOrderTotals() {
    const rows = document.querySelectorAll('.selected-item-row');
    let grandTotal = 0;

    rows.forEach(tr => {
        const index = parseInt(tr.dataset.index);
        const row = tableData[index];
        const qty = itemQuantities.get(index) || 1;

        // Sales price is in Column D (SalesPrice EUR)
        const price = parseNumberValue(row.colD);
        const rowTotal = price * qty;

        const totalCell = tr.querySelector('.total-cell');
        if (totalCell) {
            totalCell.textContent = rowTotal > 0 ? rowTotal.toFixed(2) + ' €' : '-';
        }

        grandTotal += rowTotal;
    });

    const grandEl = document.getElementById('selectedGrandTotal');
    if (grandEl) {
        grandEl.textContent = grandTotal > 0 ? grandTotal.toFixed(2) + ' €' : '-';
    }
}

// Open order modal
function openOrderModal() {
    const modal = document.getElementById('orderModal');
    const selectedItemsList = document.getElementById('selectedItemsList');
    
    // Update column headers in the order form
    const headerA = document.getElementById('selectedHeaderA');
    const headerB = document.getElementById('selectedHeaderB');
    const headerC = document.getElementById('selectedHeaderC');
    const headerD = document.getElementById('selectedHeaderD');
    
    if (headerA && columnHeaders[0]) headerA.textContent = columnHeaders[0];
    if (headerB && columnHeaders[1]) headerB.textContent = columnHeaders[1];
    if (headerC && columnHeaders[2]) headerC.textContent = columnHeaders[2];
    if (headerD && columnHeaders[3]) headerD.textContent = columnHeaders[3];
    
    // Clear previous selections
    selectedItemsList.innerHTML = '';
    itemQuantities.clear();
    
    // Display selected items in table format
    const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b);
    sortedIndices.forEach(index => {
        const row = tableData[index];
        const tr = document.createElement('tr');
        tr.className = 'selected-item-row';
        tr.setAttribute('data-index', index);
        
        // Stock quantity is in Column C (Stock qty)
        let maxQuantity = null;
        const stockValue = row.colC ? row.colC.toString().trim() : '';
        if (stockValue) {
            const parsedStock = Math.floor(parseNumberValue(stockValue));
            if (!isNaN(parsedStock) && parsedStock > 0) {
                maxQuantity = parsedStock;
            }
        }
        
        // If no valid stock quantity found, set maximum to 1
        const maxQty = maxQuantity || 1;
        const defaultQty = 1;
        
        // Store initial quantity
        itemQuantities.set(index, defaultQty);
        
        tr.innerHTML = `
            <td>${escapeHtml(row.colA)}</td>
            <td>${escapeHtml(row.colB)}</td>
            <td>${escapeHtml(row.colC)}</td>
            <td>${escapeHtml(row.colD)}</td>
            <td>
                <input type="number" 
                       class="quantity-input" 
                       data-index="${index}"
                       data-max="${maxQty}"
                       min="1" 
                       max="${maxQty}" 
                       value="${defaultQty}" 
                       required>
            </td>
            <td class="total-cell"></td>
            <td>
                <button type="button" class="remove-selected-item-btn" data-index="${index}" aria-label="Remove item">×</button>
            </td>
        `;
        selectedItemsList.appendChild(tr);
        
        // Add event listener to quantity input
        const quantityInput = tr.querySelector('.quantity-input');
        quantityInput.addEventListener('change', function() {
            const value = parseInt(this.value);
            const max = parseInt(this.dataset.max);
            if (value < 1) {
                this.value = 1;
                itemQuantities.set(index, 1);
            } else if (value > max) {
                this.value = max;
                itemQuantities.set(index, max);
                alert(`Maximum quantity is ${max} (stock qty)`);
            } else {
                itemQuantities.set(index, value);
            }
            updateOrderTotals();
        });
        
        quantityInput.addEventListener('input', function() {
            const value = parseInt(this.value);
            const max = parseInt(this.dataset.max);
            if (value > max) {
                this.value = max;
                itemQuantities.set(index, max);
            } else if (value >= 1) {
                itemQuantities.set(index, value);
            }
            updateOrderTotals();
        });

        // Remove button handler
        const removeBtn = tr.querySelector('.remove-selected-item-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                const rowIndex = parseInt(this.dataset.index);
                // Remove from selectedRows and quantities
                selectedRows.delete(rowIndex);
                itemQuantities.delete(rowIndex);
                // Uncheck checkbox in main table
                const checkbox = document.querySelector(`.row-checkbox[data-index="${rowIndex}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                }
                // Remove row from table
                tr.remove();
                // Recalculate totals
                updateOrderTotals();
            });
        }
    });
    
    // Calculate initial totals
    updateOrderTotals();
    
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
    
    // Validate quantities
    const quantityInputs = document.querySelectorAll('.quantity-input');
    let hasInvalidQuantity = false;
    
    quantityInputs.forEach(input => {
        const value = parseInt(input.value);
        const max = parseInt(input.dataset.max);
        if (isNaN(value) || value < 1 || value > max) {
            hasInvalidQuantity = true;
            input.style.borderColor = '#ff4444';
        } else {
            input.style.borderColor = '#e0e0e0';
            const index = parseInt(input.dataset.index);
            itemQuantities.set(index, value);
        }
    });
    
    if (hasInvalidQuantity) {
        showFormMessage('Please enter valid quantities for all items (between 1 and the Stock qty).', 'error');
        return;
    }
    
    // Get form data
    const formData = {
        personName: document.getElementById('personName').value,
        companyName: document.getElementById('companyName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        emailAddress: document.getElementById('emailAddress').value,
        selectedItems: Array.from(selectedRows).sort((a, b) => a - b).map(index => {
            const row = tableData[index];
            const quantity = itemQuantities.get(index) || 1;
            return `Row ${row.rowNumber}: ${row.colA} | ${row.colB} | ${row.colC} | ${row.colD} | Quantity: ${quantity}`;
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
        showFormMessage('Order submitted successfully! Email sent to epooda@intrac.ee', 'success');
        
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

// Search functionality
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const searchResults = document.getElementById('searchResults');
    
    if (!searchTerm) {
        // Show all data if search is empty
        filteredTableData = [...allTableData];
        tableData = filteredTableData;
        renderTable();
        searchResults.style.display = 'none';
        return;
    }
    
    // Search in Part Number (colA) and Description (colB, colC, colD)
    filteredTableData = allTableData.filter(row => {
        const partNumber = (row.colA || '').toLowerCase();
        const description = `${row.colB || ''} ${row.colC || ''} ${row.colD || ''}`.toLowerCase();
        
        return partNumber.includes(searchTerm) || description.includes(searchTerm);
    });
    
    tableData = filteredTableData;
    renderTable(true); // Clear selections when searching
    
    // Show search results count
    if (filteredTableData.length > 0) {
        searchResults.textContent = `Found ${filteredTableData.length} result(s)`;
        searchResults.className = 'search-results show';
    } else {
        searchResults.textContent = 'No results found';
        searchResults.className = 'search-results show';
    }
}

// Populate SEO content with part numbers and descriptions for search engines
function populateSEOContent() {
    const seoContent = document.getElementById('seoContent');
    if (!seoContent || !allTableData || allTableData.length === 0) return;
    
    // Create SEO-friendly content with part numbers and descriptions
    // Limit to first 100 items to avoid making the page too large (changed to 2000)
    const itemsToShow = allTableData.slice(0, 2000);
    
    let seoHTML = '<div class="parts-list">';
    itemsToShow.forEach(row => {
        const partNumber = escapeHtml(row.colA || '');
        const description = `${row.colB || ''}`.trim();
        
        if (partNumber || description) {
            seoHTML += `<div class="part-item">`;
            if (partNumber) {
                seoHTML += `<span class="part-number">${partNumber}</span>`;
            }
            if (description) {
                seoHTML += `<span class="part-description">${escapeHtml(description)}</span>`;
            }
            seoHTML += `</div>`;
        }
    });
    seoHTML += '</div>';
    
    seoContent.innerHTML = seoHTML;
}

// Render table with current tableData
function renderTable(clearSelections = false) {
    const tableBody = document.getElementById('tableBody');
    
    if (clearSelections) {
        selectedRows.clear(); // Clear selections when filtering
    }
    
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
        
        // Reset select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }
}

// Event listeners for search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            document.getElementById('searchInput').value = '';
            performSearch();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// Generate sitemap XML for all part numbers
function generateSitemapXML() {
    if (!allTableData || allTableData.length === 0) {
        console.log('No data available for sitemap generation');
        return;
    }
    
    let sitemapXML = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemapXML += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    sitemapXML += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    sitemapXML += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n';
    sitemapXML += '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';
    
    // Add main URLs
    sitemapXML += '    <url>\n';
    sitemapXML += '        <loc>https://www.masinaosad.ee/</loc>\n';
    sitemapXML += '        <lastmod>' + new Date().toISOString().split('T')[0] + '</lastmod>\n';
    sitemapXML += '        <changefreq>daily</changefreq>\n';
    sitemapXML += '        <priority>1.0</priority>\n';
    sitemapXML += '    </url>\n';
    
    sitemapXML += '    <url>\n';
    sitemapXML += '        <loc>https://pood.intrac.ee/</loc>\n';
    sitemapXML += '        <lastmod>' + new Date().toISOString().split('T')[0] + '</lastmod>\n';
    sitemapXML += '        <changefreq>daily</changefreq>\n';
    sitemapXML += '        <priority>1.0</priority>\n';
    sitemapXML += '    </url>\n';
    
    // Add URLs for each part number
    allTableData.forEach(row => {
        if (row.colA && row.colA.trim()) {
            const partNumber = encodeURIComponent(row.colA.trim());
            sitemapXML += '    <url>\n';
            sitemapXML += '        <loc>https://www.masinaosad.ee/?part=' + partNumber + '</loc>\n';
            sitemapXML += '        <lastmod>' + new Date().toISOString().split('T')[0] + '</lastmod>\n';
            sitemapXML += '        <changefreq>weekly</changefreq>\n';
            sitemapXML += '        <priority>0.8</priority>\n';
            sitemapXML += '    </url>\n';
        }
    });
    
    sitemapXML += '</urlset>';
    
    // Log the sitemap XML for debugging
    console.log('Generated sitemap with ' + allTableData.length + ' part numbers');
    console.log('First 500 characters of sitemap:\n', sitemapXML.substring(0, 500));
    
    // Return the sitemap XML
    return sitemapXML;
}

// Auto-refresh data daily (every 24 hours)
setInterval(() => {
    loadData();
}, 24 * 60 * 60 * 1000);

// Load data on page load
loadData();
