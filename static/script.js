// script.js - Consolidated version with all HTML script content

// DOM Elements
const phishingDetectorBtn = document.getElementById('phishingDetectorBtn');
const scamDetectorBtn = document.getElementById('scamDetectorBtn');
const phishingMode = document.getElementById('phishingMode');
const scamMode = document.getElementById('scamMode');
const urlInput = document.getElementById('urlInput');
const scamUrlInput = document.getElementById('scamUrlInput');
const scanBtn = document.getElementById('scanBtn');
const scamScanBtn = document.getElementById('scamScanBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const analysisSections = document.getElementById('analysisSections');

// Global variables for loading tracking
let scanStartTime;
let loadingInterval;

// Toggle between phishing and scam detector modes
phishingDetectorBtn.addEventListener('click', function() {
    phishingMode.classList.add('active');
    scamMode.classList.remove('active');
    phishingDetectorBtn.classList.add('active');
    scamDetectorBtn.classList.remove('active');
    urlInput.focus();
});

scamDetectorBtn.addEventListener('click', function() {
    scamMode.classList.add('active');
    phishingMode.classList.remove('active');
    scamDetectorBtn.classList.add('active');
    phishingDetectorBtn.classList.remove('active');
    scamUrlInput.focus();
});

// Add event listeners for both scan buttons
scanBtn.addEventListener('click', function() {
    const url = urlInput.value.trim();
    if (url) {
        scanUrl(url, 'phishing');
    } else {
        alert('Please enter a URL to scan');
    }
});

scamScanBtn.addEventListener('click', function() {
    const url = scamUrlInput.value.trim();
    if (url) {
        scanUrl(url, 'scam');
    } else {
        alert('Please enter a URL to scan');
    }
});

// Enter key support for both inputs
urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        scanBtn.click();
    }
});

scamUrlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        scamScanBtn.click();
    }
});

function scanUrl(url, mode = 'phishing') {
    console.log(`Scanning URL in ${mode} mode: ${url}`);
    
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const analysisSections = document.getElementById('analysisSections');
    
    // Initialize loading steps
    initializeLoadingSteps();
    
    // Show loading, hide previous results and analysis sections
    loading.classList.remove('hidden');
    result.classList.add('hidden');
    analysisSections.style.display = 'none';
    result.innerHTML = '';

    // Reset analysis sections to loading state
    resetAnalysisSections();

    // Start timer and progress tracking
    scanStartTime = Date.now();
    startLoadingTimer();
    updateProgressBar(10); // Start at 10%

    // ⭐ INCREASED TIMEOUT to 60 seconds
    const timeout = 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        clearLoadingInterval();
    }, timeout);

    // Make API call to backend
    fetch('/scan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }),
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.error || `Server error: ${response.status}`); 
            });
        }
        return response.json();
    })
    .then(data => {
        clearLoadingInterval();
        updateProgressBar(100);
        updateLoadingStep(5, true); // Mark final step as completed
        
        // Small delay to show completion
        setTimeout(() => {
            loading.classList.add('hidden');
            processScanResults(data, mode);
        }, 500);
        
    })
    .catch(error => {
        clearTimeout(timeoutId);
        clearLoadingInterval();
        loading.classList.add('hidden');
        
        if (error.name === 'AbortError') {
            showError('Scan took too long. Please try again.');
        } else {
            console.error('Scan error:', error);
            showError(error.message || 'Failed to scan URL. Please check your connection and try again.');
        }
    });
}

// New function to initialize loading steps
function initializeLoadingSteps() {
    const steps = [1, 2, 3, 4, 5];
    steps.forEach(step => {
        const stepElement = document.getElementById(`step${step}`);
        stepElement.className = 'step';
        const icon = stepElement.querySelector('.step-icon');
        icon.textContent = '⏳';
    });
    
    // Activate first step
    updateLoadingStep(1, false);
    updateProgressBar(0);
}

// New function to update loading steps
function updateLoadingStep(stepNumber, isCompleted = false) {
    const stepElement = document.getElementById(`step${stepNumber}`);
    const icon = stepElement.querySelector('.step-icon');
    
    if (isCompleted) {
        stepElement.className = 'step completed';
        icon.textContent = '✅';
    } else {
        stepElement.className = 'step active';
        icon.textContent = '🔍';
        
        // Update progress bar based on step
        const progress = (stepNumber / 5) * 80; // 80% max until completion
        updateProgressBar(progress);
    }
}

// New function to update progress bar
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = `${Math.min(100, percentage)}%`;
}

// New function to start loading timer
function startLoadingTimer() {
    const timeElement = document.getElementById('loadingTime');
    
    loadingInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - scanStartTime) / 1000);
        timeElement.textContent = `Elapsed time: ${elapsedSeconds}s`;
        
        // Simulate step progression (fallback if backend doesn't send updates)
        if (elapsedSeconds > 25) updateLoadingStep(4, false);
        else if (elapsedSeconds > 18) updateLoadingStep(3, false);
        else if (elapsedSeconds > 10) updateLoadingStep(2, false);
        
    }, 1000);
}

// New function to clear loading interval
function clearLoadingInterval() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
}


function displayMainResult(data, mode) {
    const isPhishing = data.is_phishing;
    const probability = data.probability ? (data.probability * 100).toFixed(2) : "N/A";
    const confidence = data.confidence || 'Unknown';
    const modelUsed = data.model_used || 'Machine Learning Model';
    
    let resultHTML = `
        <div class="result-card ${isPhishing ? 'phishing' : 'legitimate'}">
            <h3>Scan Results for: ${data.url}</h3>
            <div class="status ${isPhishing ? 'phishing-status' : 'legitimate-status'}">
                ${isPhishing ? '🚨 PHISHING WEBSITE DETECTED' : '✅ LEGITIMATE WEBSITE'}
            </div>
            <div class="details">
                <p><strong>Confidence:</strong> ${confidence}</p>
                <p><strong>Scan Method:</strong> ${data.scan_method || 'Hybrid Analysis'}</p>
    `;

    // Add threat intelligence info
    if (data.in_threat_feed) {
        resultHTML += `
            <div class="threat-warning">
                <p>⚠️ <strong>Threat Intelligence:</strong> Found in ${(data.threat_sources || ['threat database']).join(', ')}</p>
            </div>
        `;
    }

    // Add trusted subdomain info
    if (data.trusted_subdomain) {
        resultHTML += `
            <div class="trusted-info">
                <p>✅ <strong>Trusted Platform:</strong> ${data.subdomain_provider || 'Trusted service'}</p>
            </div>
        `;
    }

    // Add special message if available
    if (data.special_message) {
        resultHTML += `
            <div class="special-message">
                <p>${data.special_message}</p>
            </div>
        `;
    }

    // Add Google Safe Browsing status if checked
    if (data.google_safe_browsing_checked !== undefined) {
        resultHTML += `
            <div class="google-status">
                <p>${data.google_safe_browsing_success ? '✅' : '⚠️'} <strong>Google Safe Browsing:</strong> 
                ${data.google_safe_browsing_success ? 'Checked' : 'Unavailable: ' + (data.google_safe_browsing_error || 'Unknown error')}</p>
            </div>
        `;
    }

    // Add mode-specific advice
    if (mode === 'scam') {
        resultHTML += `
            <div class="freelancer-advice">
                <h4>Freelancer Advice:</h4>
                ${isPhishing ? 
                    '<p>⚠️ This appears to be a scam website. Avoid sharing personal information or accepting jobs from this source.</p>' :
                    '<p>✅ This website appears legitimate. Still exercise caution and verify client identity through multiple channels.</p>'
                }
            </div>
        `;
    } else {
        resultHTML += `
            <div class="general-advice">
                <h4>Security Advice:</h4>
                ${isPhishing ? 
                    '<p>⚠️ Do not enter any personal information on this website. Verify the URL and contact the legitimate organization directly.</p>' :
                    '<p>✅ This website appears safe. Continue to practice good security habits like using strong passwords.</p>'
                }
            </div>
        `;
    }

    resultHTML += `
            </div>
        </div>
    `;

    result.innerHTML = resultHTML;
    result.classList.remove('hidden');
}

function resetAnalysisSections() {
    // Reset contact information
    document.getElementById('emailList').innerHTML = '<li class="no-contact">No email addresses found</li>';
    document.getElementById('phoneList').innerHTML = '<li class="no-contact">No phone numbers found</li>';
    document.getElementById('contactPageList').innerHTML = '<li class="no-contact">No contact pages found</li>';
    
    // Reset screenshot
    const screenshotContainer = document.getElementById('screenshotContainer');
    screenshotContainer.innerHTML = `
        <div class="screenshot-placeholder">
            <p>Screenshot will be displayed here after analysis</p>
        </div>
    `;
    
    // Reset image analysis
    const imageAnalysisResult = document.getElementById('imageAnalysisResult');
    imageAnalysisResult.style.display = 'none';
    document.getElementById('imageAnalysisContent').innerHTML = '';
    
    // Reset technical analysis
    document.getElementById('sslStatus').textContent = 'Checking...';
    document.getElementById('sslStatus').className = 'tech-value status-info';
    document.getElementById('sslExpiry').textContent = 'N/A';
    document.getElementById('dnsCount').textContent = 'Checking...';
    document.getElementById('domainAge').textContent = 'N/A';
    document.getElementById('safeBrowsing').textContent = 'Checking...';
    document.getElementById('safeBrowsing').className = 'tech-value status-info';
    document.getElementById('blacklistStatus').textContent = 'Clean';
    document.getElementById('blacklistStatus').className = 'tech-value status-safe';
    document.getElementById('reachabilityStatus').textContent = 'Checking...';
    document.getElementById('reachabilityStatus').className = 'tech-value status-info';
    document.getElementById('responseTime').textContent = 'N/A';
}

function updateAnalysisSections(data) {
    // Update contact information
    if (data.contacts_found) {
        updateContactInformation(data.contacts_found);
    }
    
    // Update technical analysis
    if (data.features || data.threat_intel) {
        updateTechnicalAnalysis(data.features, data.threat_intel);
    }
    
    // Update screenshot
    if (data.screenshot) {
        updateScreenshot(data.screenshot);
    }
}

function updateContactInformation(contacts) {
    const emailList = document.getElementById('emailList');
    const phoneList = document.getElementById('phoneList');
    const contactPageList = document.getElementById('contactPageList');
    
    // Update emails
    if (contacts.emails && contacts.emails.length > 0) {
        emailList.innerHTML = contacts.emails.map(email => `<li>${email}</li>`).join('');
    } else {
        emailList.innerHTML = '<li class="no-contact">No email addresses found</li>';
    }
    
    // Update phones
    if (contacts.phones && contacts.phones.length > 0) {
        phoneList.innerHTML = contacts.phones.map(phone => `<li>${phone}</li>`).join('');
    } else {
        phoneList.innerHTML = '<li class="no-contact">No phone numbers found</li>';
    }
    
    // Update contact pages
    if (contacts.contact_pages && contacts.contact_pages.length > 0) {
        contactPageList.innerHTML = contacts.contact_pages.map(page => `<li>${page}</li>`).join('');
    } else {
        contactPageList.innerHTML = '<li class="no-contact">No contact pages found</li>';
    }
}

function updateTechnicalAnalysis(features, threatIntel) {
    // Update SSL information
    if (features && features.has_ssl !== undefined) {
        const sslStatus = document.getElementById('sslStatus');
        sslStatus.textContent = features.has_ssl ? 'Valid' : 'Invalid';
        sslStatus.className = features.has_ssl ? 'tech-value status-safe' : 'tech-value status-danger';
    }
    
    if (features && features.ssl_expiry) {
        document.getElementById('sslExpiry').textContent = features.ssl_expiry;
    } else {
        document.getElementById('sslExpiry').textContent = 'N/A';
    }
    
    // Update DNS information
    if (features && features.dns_records !== undefined) {
        const dnsCount = document.getElementById('dnsCount');
        if (typeof features.dns_records === 'object') {
            let totalRecords = 0;
            if (features.dns_records.A) totalRecords += features.dns_records.A.length;
            if (features.dns_records.MX) totalRecords += features.dns_records.MX.length;
            if (features.dns_records.NS) totalRecords += features.dns_records.NS.length;
            if (features.dns_records.TXT) totalRecords += features.dns_records.TXT.length;
            
            dnsCount.textContent = `${totalRecords} Records Found`;
            dnsCount.title = `A: ${features.dns_records.A?.length || 0}, MX: ${features.dns_records.MX?.length || 0}, NS: ${features.dns_records.NS?.length || 0}, TXT: ${features.dns_records.TXT?.length || 0}`;
        } else {
            dnsCount.textContent = features.dns_records;
        }
    }
    
    if (features && features.domain_age) {
        document.getElementById('domainAge').textContent = features.domain_age;
    } else {
        document.getElementById('domainAge').textContent = 'N/A';
    }
    
    // ✅ FULLY FIXED: Threat intelligence with unreachable website handling
    if (threatIntel) {
        const safeBrowsing = document.getElementById('safeBrowsing');
        const blacklistStatus = document.getElementById('blacklistStatus');
        
        // Check if website is unreachable (using features.reachable)
        const isUnreachable = features && features.reachable === false;
        
        if (isUnreachable) {
            // Website is unreachable - show appropriate status
            safeBrowsing.textContent = 'Unreachable';
            safeBrowsing.className = 'tech-value status-warning';
            
            // Use heuristic detection or blacklist status for unreachable sites
            if (threatIntel.heuristic_detected || threatIntel.blacklisted) {
                blacklistStatus.textContent = 'Suspicious (Heuristic)';
                blacklistStatus.className = 'tech-value status-danger';
            } else {
                blacklistStatus.textContent = 'Unknown';
                blacklistStatus.className = 'tech-value status-warning';
            }
        } else {
            // Website is reachable - normal display logic
            safeBrowsing.textContent = threatIntel.safe_browsing ? 'Reported' : 'Clean';
            safeBrowsing.className = threatIntel.safe_browsing ? 'tech-value status-danger' : 'tech-value status-safe';
            
            blacklistStatus.textContent = threatIntel.blacklisted ? 'Blacklisted' : 'Clean';
            blacklistStatus.className = threatIntel.blacklisted ? 'tech-value status-danger' : 'tech-value status-safe';
        }
    } else {
        // Fallback if no threat intelligence data
        const safeBrowsing = document.getElementById('safeBrowsing');
        const blacklistStatus = document.getElementById('blacklistStatus');
        safeBrowsing.textContent = 'Unknown';
        safeBrowsing.className = 'tech-value status-warning';
        blacklistStatus.textContent = 'Unknown';
        blacklistStatus.className = 'tech-value status-warning';
    }
    
    // Update reachability
    if (features && features.reachable !== undefined) {
        const reachabilityStatus = document.getElementById('reachabilityStatus');
        reachabilityStatus.textContent = features.reachable ? 'Reachable' : 'Unreachable';
        reachabilityStatus.className = features.reachable ? 'tech-value status-safe' : 'tech-value status-danger';
    }
    
    if (features && features.response_time) {
        document.getElementById('responseTime').textContent = features.response_time;
    } else {
        document.getElementById('responseTime').textContent = 'N/A';
    }
}
function updateScreenshot(screenshotData) {
    const screenshotContainer = document.getElementById('screenshotContainer');
    
    console.log("🖼️ Screenshot data received:", screenshotData);
    
    // Clear container
    screenshotContainer.innerHTML = '';
    
    if (!screenshotData || screenshotData.error) {
        const errorMsg = screenshotData?.error || 'No screenshot data available';
        const note = screenshotData?.note || '';
        
        screenshotContainer.innerHTML = `
            <div class="screenshot-placeholder">
                <p>${errorMsg}</p>
                ${note ? `<p class="note">${note}</p>` : ''}
            </div>
        `;
        return;
    }
    
    const screenshotUrl = screenshotData.url || 
                         (screenshotData.filename ? `/static/screenshots/${screenshotData.filename}` : null);
    
    if (screenshotUrl) {
        console.log("📸 Loading screenshot from:", screenshotUrl);
        
        screenshotContainer.innerHTML = `
            <div class="screenshot-with-loader">
                <img src="${screenshotUrl}" alt="Website Screenshot" class="screenshot-image" 
                     id="currentScreenshotImg">
                <p class="screenshot-info" id="screenshotStatusText">Loading screenshot...</p>
            </div>
        `;
        
        const img = document.getElementById('currentScreenshotImg');
        const statusText = document.getElementById('screenshotStatusText');
        
        img.onload = function() {
            console.log("✅ Screenshot loaded successfully");
            this.classList.add('loaded');
            if (statusText) {
                statusText.textContent = 'Website screenshot captured successfully';
                statusText.style.color = '#38a169'; // Success green
            }
        };
        
        img.onerror = function() {
            console.error("❌ Screenshot failed to load");
            screenshotContainer.innerHTML = `
                <div class="screenshot-placeholder">
                    <p>Failed to load screenshot</p>
                    <p class="note">The screenshot could not be displayed</p>
                    <button class="retry-btn" onclick="retryScreenshot('${screenshotUrl}')">Retry</button>
                </div>
            `;
        };
        
        // Fallback timeout
        setTimeout(() => {
            if (img && !img.classList.contains('loaded') && statusText && statusText.textContent === 'Loading screenshot...') {
                console.log("⏰ Screenshot load timeout");
                screenshotContainer.innerHTML = `
                    <div class="screenshot-placeholder">
                        <p>Screenshot load timeout</p>
                        <p class="note">The screenshot is taking too long to load</p>
                        <button class="retry-btn" onclick="retryScreenshot('${screenshotUrl}')">Retry</button>
                    </div>
                `;
            }
        }, 10000);
        
    } else {
        screenshotContainer.innerHTML = `
            <div class="screenshot-placeholder">
                <p>No screenshot available</p>
            </div>
        `;
    }
}

// Retry function
function retryScreenshot(url) {
    console.log("🔄 Retrying screenshot:", url);
    const screenshotContainer = document.getElementById('screenshotContainer');
    
    screenshotContainer.innerHTML = `
        <div class="screenshot-with-loader">
            <img src="${url}?retry=${Date.now()}" alt="Website Screenshot" class="screenshot-image" 
                 id="currentScreenshotImg">
            <p class="screenshot-info" id="screenshotStatusText">Retrying...</p>
        </div>
    `;
    
    const img = document.getElementById('currentScreenshotImg');
    const statusText = document.getElementById('screenshotStatusText');
    
    img.onload = function() {
        console.log("✅ Retry successful");
        this.classList.add('loaded');
        if (statusText) {
            statusText.textContent = 'Website screenshot loaded successfully';
            statusText.style.color = '#38a169';
        }
    };
    
    img.onerror = function() {
        console.error("❌ Retry failed");
        screenshotContainer.innerHTML = `
            <div class="screenshot-placeholder">
                <p>Failed to load screenshot</p>
                <p class="note">Please try scanning again</p>
            </div>
        `;
    };
}
// Separate load handler
function handleScreenshotLoad() {
    console.log("✅ Screenshot loaded successfully");
    const img = document.getElementById('screenshotImg');
    const info = document.getElementById('screenshotInfo');
    
    if (img) {
        img.classList.add('loaded');
    }
    if (info) {
        info.textContent = 'Website screenshot captured successfully';
    }
}

// Separate error handler
function handleScreenshotError() {
    console.error("❌ Screenshot failed to load");
    const loader = document.getElementById('screenshotLoader');
    const img = document.getElementById('screenshotImg');
    
    if (loader && img) {
        loader.innerHTML = `
            <div class="screenshot-placeholder">
                <p>Failed to load screenshot</p>
                <p class="note">The screenshot could not be displayed</p>
            </div>
        `;
    }
}
// New function to test image accessibility
function testImageAccessibility(url) {
    console.log("🔍 Testing image accessibility for:", url);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log("✅ TEST: Image URL is accessible - dimensions:", this.naturalWidth, "x", this.naturalHeight);
        document.getElementById('screenshotInfo').textContent = 'Website screenshot loaded successfully';
    };
    testImg.onerror = function() {
        console.log("❌ TEST: Image URL is NOT accessible:", url);
        document.getElementById('screenshotInfo').textContent = 'Failed to load screenshot - URL not accessible';
    };
    testImg.src = url;
}

// Error handler function
function handleScreenshotError(imgElement, url) {
    console.error("💥 Screenshot load failed:", {
        url: url,
        imgSrc: imgElement.src,
        naturalWidth: imgElement.naturalWidth,
        naturalHeight: imgElement.naturalHeight,
        complete: imgElement.complete,
        currentSrc: imgElement.currentSrc
    });
    
    const container = imgElement.parentNode;
    container.innerHTML = `
        <div class="screenshot-placeholder">
            <p>❌ Failed to load screenshot</p>
            <p class="note">URL: ${url}</p>
            <p class="note">The screenshot file exists but cannot be displayed.</p>
            <button class="retry-btn" onclick="retryScreenshot('${url}')">Retry Load</button>
        </div>
    `;
}

// Retry function
function retryScreenshot(url) {
    console.log("🔄 Retrying screenshot load:", url);
    const img = document.createElement('img');
    img.src = url + '?retry=' + Date.now(); // Cache bust
    img.onload = function() {
        document.getElementById('screenshotContainer').innerHTML = `
            <div class="screenshot-with-loader">
                <img src="${this.src}" alt="Website Screenshot" class="screenshot-image loaded">
                <p class="screenshot-info">Website screenshot (retry successful)</p>
            </div>
        `;
    };
}
function displayImageAnalysis(imageAnalysis) {
    const imageAnalysisResult = document.getElementById('imageAnalysisResult');
    const imageAnalysisContent = document.getElementById('imageAnalysisContent');
    
    if (!imageAnalysis) {
        imageAnalysisResult.style.display = 'none';
        return;
    }
    
    let analysisHTML = '';
    let resultClass = '';
    
    if (imageAnalysis.is_phishing) {
        resultClass = 'analysis-phishing';
        analysisHTML = `
            <div class="analysis-result ${resultClass}">
                <strong>Phishing Indicators Found:</strong>
                <ul>
                    ${imageAnalysis.reasons ? imageAnalysis.reasons.map(reason => `<li>${reason}</li>`).join('') : '<li>Suspicious visual elements detected</li>'}
                </ul>
                ${imageAnalysis.confidence ? `<p>Confidence: ${(imageAnalysis.confidence * 100).toFixed(2)}%</p>` : ''}
            </div>
        `;
    } else {
        resultClass = 'analysis-legitimate';
        analysisHTML = `
            <div class="analysis-result ${resultClass}">
                <strong>No significant phishing indicators found in images.</strong>
                ${imageAnalysis.confidence ? `<p>Confidence: ${(imageAnalysis.confidence * 100).toFixed(2)}%</p>` : ''}
            </div>
        `;
    }
    
    imageAnalysisContent.innerHTML = analysisHTML;
    imageAnalysisResult.style.display = 'block';
}

function showError(message) {
    const result = document.getElementById('result');
    result.innerHTML = `
        <div class="error">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
    result.classList.remove('hidden');
    
    // Smooth scroll to error
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// Simplify the JavaScript - just display the score from Python
function calculateAndShowScore(scanData) {
    console.log("📊 Displaying score from Python:", scanData);
    
    // Check if Python already calculated the score
    if (scanData.score_analysis) {
        const scoreData = scanData.score_analysis;
        displayScore(
            scoreData.total_score,
            scoreData.is_legitimate,
            scoreData.status,
            scoreData.breakdown
        );
    } else {
        // Fallback to JavaScript calculation if Python didn't provide score
        console.warn("⚠️ No Python score data, using JavaScript fallback");
        calculateScoreJS(scanData);
    }
}

// Fallback JavaScript calculation (keep as backup)
function calculateScoreJS(scanData) {
    let score = 0;
    const breakdown = {
        ml: 0,
        contact: 0,
        image: 0,
        ssl: 0,
        dns: 0,
        reach: 0,
        penalty: 0
    };
    
    // Same logic as before but simplified
    if (scanData.is_phishing === false) {
        score += 20;
        breakdown.ml = 20;
    }
    
    const contacts = scanData.contacts_found || {};
    if ((contacts.emails && contacts.emails.length > 0) ||
        (contacts.phones && contacts.phones.length > 0) ||
        (contacts.contact_pages && contacts.contact_pages.length > 0)) {
        score += 30;
        breakdown.contact = 30;
    }
    
    const imageAnalysis = scanData.image_analysis || {};
    if (imageAnalysis.is_phishing === true) {
        score -= 40;
        breakdown.image = -40;
        breakdown.penalty += 40;
    } else if (imageAnalysis.is_phishing === false) {
        score += 20;
        breakdown.image = 20;
    }
    
    const features = scanData.features || {};
    if (features.has_ssl === true) {
        score += 10;
        breakdown.ssl = 10;
    }
    
    const dns = features.dns_records || {};
    if (dns.resolved === true || 
        (dns.A && dns.A.length > 0) || 
        (dns.MX && dns.MX.length > 0)) {
        score += 10;
        breakdown.dns = 10;
    }
    
    if (features.reachable === true) {
        score += 10;
        breakdown.reach = 10;
    } else if (features.reachable === false) {
        score -= 10;
        breakdown.reach = -10;
        breakdown.penalty += 10;
    }
    
    const threat = scanData.threat_intel || {};
    if (threat.blacklisted === true) {
        score -= 10;
        breakdown.penalty += 10;
    }
    
    score = Math.max(0, Math.min(100, score));
    const isLegitimate = score >= 50;
    const status = isLegitimate ? "LEGITIMATE WEBSITE" : "SUSPICIOUS WEBSITE";
    
    displayScore(score, isLegitimate, status, breakdown);
}

// Display score in popup - with auto-show
function displayScore(totalScore, isLegitimate, status, breakdown) {
    console.log("🎯 Displaying auto-score popup");
    
    const popup = document.getElementById('scorePopup');
    if (!popup) {
        console.error("❌ Popup element not found!");
        return;
    }
    
    // Update all content first
    document.getElementById('totalScore').textContent = totalScore;
    const scoreCircle = document.querySelector('.total-score-circle');
    scoreCircle.className = 'total-score-circle ' + (isLegitimate ? 'legitimate' : 'suspicious');
    
    const statusEl = document.getElementById('scoreStatusLabel');
    statusEl.textContent = status;
    statusEl.className = 'score-status ' + (isLegitimate ? 'legitimate' : 'suspicious');
    
    // Update breakdown
    const mlScore = breakdown.ml_analysis || breakdown.ml || 0;
    const contactScore = breakdown.contact_info || breakdown.contact || 0;
    const imageScore = breakdown.image_analysis || breakdown.image || 0;
    const sslScore = breakdown.ssl || 0;
    const dnsScore = breakdown.dns || 0;
    const reachScore = breakdown.reachability || breakdown.reach || 0;
    const penaltyScore = breakdown.penalties || breakdown.penalty || 0;
    
    document.getElementById('mlPoints').textContent = mlScore >= 0 ? '+' + mlScore : mlScore;
    document.getElementById('contactPoints').textContent = contactScore >= 0 ? '+' + contactScore : contactScore;
    document.getElementById('imagePoints').textContent = imageScore >= 0 ? '+' + imageScore : imageScore;
    document.getElementById('sslPoints').textContent = sslScore >= 0 ? '+' + sslScore : sslScore;
    document.getElementById('dnsPoints').textContent = dnsScore >= 0 ? '+' + dnsScore : dnsScore;
    document.getElementById('reachPoints').textContent = reachScore >= 0 ? '+' + reachScore : reachScore;
    
    if (penaltyScore > 0) {
        document.getElementById('penaltiesItem').style.display = 'flex';
        document.getElementById('penaltyPoints').textContent = '-' + penaltyScore;
    } else {
        document.getElementById('penaltiesItem').style.display = 'none';
    }
    
    // Update verdict
    const verdictBox = document.getElementById('verdictBox');
    const verdictText = document.getElementById('verdictText');
    
    verdictBox.className = 'verdict-box ' + (isLegitimate ? 'legitimate' : 'suspicious');
    
    let message = '';
    if (totalScore >= 80) message = '✅ Excellent! Highly legitimate website';
    else if (totalScore >= 60) message = '✓ Good! Mostly legitimate website';
    else if (totalScore >= 50) message = '⚠️ Balanced website - Exercise caution';
    else if (totalScore >= 30) message = '🚨 Suspicious! Likely phishing website';
    else message = '⛔ Critical! High probability of phishing';
    
    verdictText.textContent = `${message} (${totalScore}/100)`;
    
    // Show the popup with animation
    console.log("🔄 Showing popup...");
    popup.style.display = 'flex';
    popup.classList.add('showing');
    
    // Auto-close after 10 seconds (optional)
    setTimeout(() => {
        if (popup.style.display === 'flex') {
            console.log("⏰ Auto-closing popup after 10 seconds");
            // You can add a countdown or just close it
            // closeScorePopup();
        }
    }, 10000);
}

// Debug function to test popup
function testScorePopup() {
    console.log("🧪 Testing score popup...");
    
    // Create test data
    const testData = {
        is_phishing: false,
        contacts_found: {
            emails: ['test@example.com'],
            phones: [],
            contact_pages: ['/contact']
        },
        image_analysis: {
            is_phishing: false,
            confidence: 0.85
        },
        features: {
            has_ssl: true,
            dns_records: { resolved: true, A: ['192.168.1.1'] },
            reachable: true
        },
        threat_intel: {
            blacklisted: false
        }
    };
    
    calculateAndShowScore(testData);
}
function processScanResults(data, mode) {
    console.log("🔍 FULL API RESPONSE:", data);
    console.log("📸 SCREENSHOT DATA IN RESPONSE:", data.screenshot);
    
    if (data.error) {
        showError(data.error);
        return;
    }

    // Display main result
    if (data.is_phishing !== undefined) {
        displayMainResult(data, mode);
    } else {
        showError('No analysis results available');
    }
    
    // Debug screenshot data
    if (data.screenshot) {
        console.log("✅ Screenshot data found:", {
            url: data.screenshot.url,
            filename: data.screenshot.filename,
            error: data.screenshot.error,
            success: data.screenshot.success
        });
        console.log("🔄 Calling updateScreenshot...");
        updateScreenshot(data.screenshot);
    } else {
        console.log("❌ NO SCREENSHOT DATA IN RESPONSE!");
        updateScreenshot(null);
    }
    
    // Update other analysis sections
    updateAnalysisSections(data);
    
    // Display image analysis results
    if (data.image_analysis) {
        displayImageAnalysis(data.image_analysis);
    }
    
    // Show analysis sections
    document.getElementById('analysisSections').style.display = 'block';
    
    // ✅ MOVED HERE: Add score button AFTER all analysis is complete
    // Wait a moment to ensure all data is processed
    setTimeout(() => {
        showScorePopupAutomatically(data);
    }, 1000);
    
    // Smooth scroll to results
    document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// Show score popup automatically after scan
function showScorePopupAutomatically(scanData) {
     const autoPopupToggle = document.getElementById('autoPopupToggle');
    if (autoPopupToggle && !autoPopupToggle.checked) {
        console.log("⚙️ Auto-popup disabled by user");
        // Just add a button instead
        addScoreButtonFallback(scanData);
        return;
    }
    
    console.log("🎯 Auto-showing score popup");
    
    // Check if Python already calculated the score
    if (scanData.score_analysis) {
        const scoreData = scanData.score_analysis;
        console.log("✅ Using Python-calculated score:", scoreData);
        
        displayScore(
            scoreData.total_score,
            scoreData.is_legitimate,
            scoreData.status,
            scoreData.breakdown
        );
        
        // Optional: Add a small message explaining the popup
        setTimeout(() => {
            const resultElement = document.getElementById('result');
            if (resultElement) {
                const infoMsg = document.createElement('div');
                infoMsg.className = 'score-popup-info';
                infoMsg.innerHTML = `
                    <p style="text-align: center; color: #666; margin-top: 10px; font-size: 0.9em;">
                        📊 <strong>Score Analysis:</strong> ${scoreData.total_score}/100 
                        | <a href="javascript:void(0)" onclick="showScorePopupAutomatically(${JSON.stringify(scanData)})" style="color: #3498db;">View Again</a>
                        | <button onclick="closeScorePopup()" style="background: none; border: none; color: #666; text-decoration: underline; cursor: pointer;">Close Popup</button>
                    </p>
                `;
                
                const resultCard = resultElement.querySelector('.result-card');
                if (resultCard) {
                    // Remove existing info if any
                    const existingInfo = resultCard.querySelector('.score-popup-info');
                    if (existingInfo) existingInfo.remove();
                    
                    resultCard.appendChild(infoMsg);
                }
            }
        }, 500);
        
    } else {
        // Fallback to JavaScript calculation
        console.warn("⚠️ No Python score data, calculating in JavaScript");
        calculateScoreJS(scanData);
    }
}
let popupAutoCloseTimer;

function showPopupWithAutoClose(scoreData) {
    // Show the popup first
    displayScore(scoreData);
    
    // Clear any existing timer
    if (popupAutoCloseTimer) {
        clearTimeout(popupAutoCloseTimer);
    }
    
    // Auto-close after 15 seconds
    popupAutoCloseTimer = setTimeout(() => {
        console.log("⏰ Auto-closing popup after 15 seconds");
        closeScorePopup();
    }, 15000);
    
    // Add countdown indicator
    addAutoCloseCountdown(15);
}

function addAutoCloseCountdown(seconds) {
    const footer = document.querySelector('.popup-footer');
    if (!footer) return;
    
    const countdownEl = document.createElement('div');
    countdownEl.id = 'popupCountdown';
    countdownEl.style.cssText = `
        text-align: center;
        color: #7f8c8d;
        font-size: 0.9em;
        margin-top: 10px;
    `;
    
    let remaining = seconds;
    countdownEl.textContent = `Auto-closes in ${remaining}s (click anywhere to keep open)`;
    
    const countdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownEl.remove();
        } else {
            countdownEl.textContent = `Auto-closes in ${remaining}s (click anywhere to keep open)`;
        }
    }, 1000);
    
    // Reset timer if user interacts
    document.addEventListener('click', function resetTimer() {
        remaining = seconds;
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownEl.remove();
                document.removeEventListener('click', resetTimer);
            } else {
                countdownEl.textContent = `Auto-closes in ${remaining}s (click anywhere to keep open)`;
            }
        }, 1000);
    }, { once: false });
    
    footer.appendChild(countdownEl);
}
// Set up all popup event listeners
function setupPopupListeners() {
    const popup = document.getElementById('scorePopup');
    if (!popup) {
        console.error("❌ Popup not found for event listeners");
        return;
    }
    
    // 1. Click outside popup to close
    popup.addEventListener('click', function(e) {
        if (e.target === this) {
            console.log("🎯 Clicked outside popup - closing");
            closeScorePopup();
        }
    });
    
    // 2. Escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            console.log("⌨️ Escape key pressed - closing popup");
            closeScorePopup();
        }
    });
    
    // 3. Close button click (already in HTML onclick)
    const closeBtn = document.querySelector('.close-popup');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeScorePopup);
    }
    
    // 4. Close button in footer
    const footerCloseBtn = document.querySelector('.popup-footer button');
    if (footerCloseBtn && footerCloseBtn.textContent.includes('Close')) {
        footerCloseBtn.addEventListener('click', closeScorePopup);
    }
    
    console.log("✅ All popup event listeners set up");
}

// Add this function to debug data
function debugDataStructure(data) {
    console.log("🔍 DEBUG DATA STRUCTURE:");
    
    // Check if data exists
    if (!data) {
        console.error("❌ No data received!");
        return;
    }
    
    // Check each property
    const checks = {
        'is_phishing': data.is_phishing,
        'contacts_found.emails': data.contacts_found?.emails,
        'contacts_found.phones': data.contacts_found?.phones,
        'contacts_found.contact_pages': data.contacts_found?.contact_pages,
        'image_analysis.is_phishing': data.image_analysis?.is_phishing,
        'features.has_ssl': data.features?.has_ssl,
        'features.dns_records': data.features?.dns_records,
        'features.reachable': data.features?.reachable,
        'threat_intel.blacklisted': data.threat_intel?.blacklisted
    };
    
    Object.entries(checks).forEach(([key, value]) => {
        console.log(`${key}:`, value, `(type: ${typeof value})`);
    });
    
    // Check data types
    console.log("📋 Data types check:");
    console.log("- is_phishing is boolean?", typeof data.is_phishing === 'boolean');
    console.log("- has_ssl is boolean?", typeof data.features?.has_ssl === 'boolean');
    console.log("- reachable is boolean?", typeof data.features?.reachable === 'boolean');
    console.log("- blacklisted is boolean?", typeof data.threat_intel?.blacklisted === 'boolean');
    
    // Show raw data
    console.log("📦 Raw data snippet:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
}
// Debug function to see what data is being received
function debugScanData(scanData) {
    console.log("🔍 DEBUG SCAN DATA:");
    console.log("- is_phishing:", scanData.is_phishing);
    console.log("- contacts_found:", scanData.contacts_found);
    console.log("- image_analysis:", scanData.image_analysis);
    console.log("- features.has_ssl:", scanData.features?.has_ssl);
    console.log("- features.dns_records:", scanData.features?.dns_records);
    console.log("- features.reachable:", scanData.features?.reachable);
    console.log("- threat_intel.blacklisted:", scanData.threat_intel?.blacklisted);
    
    // Log raw data for inspection
    console.log("📦 RAW DATA:", JSON.stringify(scanData, null, 2));
}
// Debug function to check popup status
function debugPopup() {
    const popup = document.getElementById('scorePopup');
    console.log("🔍 Popup Debug:");
    console.log("- Popup element exists:", !!popup);
    console.log("- Current display style:", popup ? popup.style.display : 'N/A');
    console.log("- CSS class list:", popup ? popup.className : 'N/A');
    console.log("- Window dimensions:", window.innerWidth, "x", window.innerHeight);
}
// Test button - add this to your HTML temporarily:
// Close popup - FIXED
function closeScorePopup() {
    const popup = document.getElementById('scorePopup');
    if (popup) {
        console.log("❌ Closing popup");
        popup.style.display = 'none';
    }
}

// Close popup when clicking outside - FIXED
function setupPopupListeners() {
    const popup = document.getElementById('scorePopup');
    if (!popup) {
        console.error("❌ Popup not found for event listeners");
        return;
    }
    
    // Click outside to close
    popup.addEventListener('click', function(e) {
        if (e.target === this) {
            console.log("🎯 Clicked outside popup - closing");
            closeScorePopup();
        }
    });
    
    // Escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            console.log("⌨️ Escape key pressed - closing popup");
            closeScorePopup();
        }
    });
    
    console.log("✅ Popup event listeners set up");
}

// Test function that should work
function testScorePopup() {
    console.log("🧪 Testing popup display...");
    
    // Create test data matching Python structure
    const testData = {
        score_analysis: {
            total_score: 0,
            is_legitimate: false,
            status: "SUSPICIOUS WEBSITE",
            breakdown: {
                ml_analysis: 0,
                contact_info: 0,
                image_analysis: -40,
                ssl: 0,
                dns: 10,
                reachability: -10,
                penalties: 60
            }
        }
    };
    
    calculateAndShowScore(testData);
}


// Add a visible test button
