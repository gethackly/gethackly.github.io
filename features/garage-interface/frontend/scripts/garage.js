// Import Firebase services
import { db, auth } from './firebase-config.js';

// DOM Elements
const ideaList = document.getElementById('idea_list');
const loadingMessage = document.getElementById('loading_message');
const ideasCount = document.getElementById('ideas_count');
const searchInput = document.querySelector('.search_input');
const sortButtons = document.querySelectorAll('.sort_button');
const prevPageButton = document.getElementById('prev_page');
const nextPageButton = document.getElementById('next_page');
const currentPageSpan = document.getElementById('current_page');
const docModal = document.getElementById('doc_modal');
const docIframe = document.getElementById('doc_iframe');
const closeDocModal = document.getElementById('close_doc_modal');

// State
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;
let currentSortField = 'date'; // 'date' or 'views'
let currentSortDirection = 'desc'; // 'asc' or 'desc'
let currentSearch = '';

// Global state for modal navigation
let currentDocList = [];
let currentDocIndex = -1;

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to initialize
        await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve();
            });
        });

        initializeAccordion();
        await loadDocuments();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing garage:', error);
        loadingMessage.textContent = 'Error initializing application. Please refresh the page.';
    }
});

function initializeAccordion() {
    const accordionButton = document.querySelector('.accordion_button');
    const accordionContent = document.querySelector('.accordion_content');
    
    accordionButton.addEventListener('click', () => {
        accordionButton.classList.toggle('active');
        if (accordionButton.classList.contains('active')) {
            accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        } else {
            accordionContent.style.maxHeight = "0";
        }
    });
}

function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', debounce(() => {
        currentSearch = searchInput.value;
        currentPage = 1;
        loadDocuments();
    }, 300));

    // Create button handlers
    const desktopSubmitButton = document.getElementById('submit_idea_desktop');
    const mobileSubmitButton = document.getElementById('submit_idea_mobile');
    const desktopTitleInput = document.getElementById('title_desktop');
    const mobileTitleInput = document.getElementById('title_mobile');

    if (desktopSubmitButton && desktopTitleInput) {
        desktopSubmitButton.addEventListener('click', () => {
            handleCreatePrompt(desktopTitleInput, desktopSubmitButton);
        });
        // Handle Enter key press
        desktopTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                handleCreatePrompt(desktopTitleInput, desktopSubmitButton);
            }
        });
    }

    if (mobileSubmitButton && mobileTitleInput) {
        mobileSubmitButton.addEventListener('click', () => {
            handleCreatePrompt(mobileTitleInput, mobileSubmitButton);
        });
        // Handle Enter key press
        mobileTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                handleCreatePrompt(mobileTitleInput, mobileSubmitButton);
            }
        });
    }

    // Sort
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            let sortType;
            if (button.classList.contains('sort_by_date')) {
                sortType = 'date';
            } else if (button.classList.contains('sort_by_views') || button.classList.contains('sort_by_rank')) {
                sortType = 'views';
            }
            if (currentSortField === sortType) {
                // Toggle direction
                currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                currentSortField = sortType;
                currentSortDirection = 'desc';
            }
            // UI feedback for active sort
            sortButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateSortIcons();
            currentPage = 1;
            loadDocuments();
        });
    });

    // Pagination
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadDocuments();
        }
    });

    nextPageButton.addEventListener('click', () => {
        currentPage++;
        loadDocuments();
    });

    // Modal
    closeDocModal.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
    });
}

async function loadDocuments() {
    try {
        loadingMessage.style.display = 'block';
        ideaList.innerHTML = '';

        // Fetch all documents
        const snapshot = await db.collection('documents').get();
        let docs = [];
        snapshot.forEach(doc => {
            docs.push({ id: doc.id, ...doc.data() });
        });

        // Filter by search
        if (currentSearch) {
            docs = docs.filter(d =>
                (d.title || '').toLowerCase().includes(currentSearch.toLowerCase())
            );
        }

        // Sort
        docs.sort((a, b) => {
            let comparison = 0;
            if (currentSortField === 'date') {
                let aTime = a.createdAt && a.createdAt.seconds
                    ? a.createdAt.seconds
                    : (typeof a.createdAt === 'string' ? Date.parse(a.createdAt) / 1000 : 0);
                let bTime = b.createdAt && b.createdAt.seconds
                    ? b.createdAt.seconds
                    : (typeof b.createdAt === 'string' ? Date.parse(b.createdAt) / 1000 : 0);
                comparison = aTime - bTime;
            } else if (currentSortField === 'views') {
                comparison = (a.views || 0) - (b.views || 0);
            }
            return currentSortDirection === 'desc' ? -comparison : comparison;
        });

        totalItems = docs.length;
        ideasCount.textContent = `${totalItems} prompts`;

        // Pagination
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageDocs = docs.slice(start, end);

        if (pageDocs.length === 0) {
            ideaList.innerHTML = '<li class="idea_container">No prompts found</li>';
        } else {
            pageDocs.forEach(data => {
                const ideaElement = createIdeaElement(data.id, data);
                ideaList.appendChild(ideaElement);
            });
        }

        updatePagination(totalPages);
        loadingMessage.style.display = 'none';
        updateSortIcons();
    } catch (error) {
        console.error('Error loading documents:', error);
        loadingMessage.textContent = 'Error loading documents. Please try again.';
    }
}

function createIdeaElement(id, data) {
    const li = document.createElement('li');
    li.className = 'idea_container';
    li.dataset.docId = id;
    li._docData = data;

    // Handle createdAt as string or Timestamp
    let formattedDate = '';
    if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
            formattedDate = data.createdAt;
        } else if (data.createdAt.seconds) {
            const date = new Date(data.createdAt.seconds * 1000);
            formattedDate = date.toLocaleDateString();
        }
    }

    li.innerHTML = `
        <div class="idea_date">
            <span class="material-icons">calendar_today</span>
            ${formattedDate}
        </div>
        <div class="idea_name">${data.title || 'Untitled'}</div>
        <div class="idea_views">
            <span class="material-icons">visibility</span>
            ${data.views || 0}
        </div>
    `;

    li.addEventListener('click', () => openDocument(id, data));
    return li;
}

function updatePagination(totalPages) {
    currentPageSpan.textContent = currentPage;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
}

function openDocument(id, data) {
    window.currentDocId = id; // Store globally for modal use

    // Find the current list and index for navigation
    if (!currentDocList.length) {
        // Try to get the current list from the DOM
        currentDocList = Array.from(document.querySelectorAll('.idea_container')).map(li => li.dataset.docId);
    }
    currentDocIndex = currentDocList.indexOf(id);

    // Show modal with transition
    docModal.style.display = 'block';
    docModal.offsetHeight;
    docModal.classList.add('active');
    document.body.classList.add('no-scroll');

    // Reset generate text button state
    const generateTextBtn = document.getElementById('generate_text_btn');
    if (generateTextBtn) {
        generateTextBtn.disabled = false;
        generateTextBtn.title = 'Evaluate Prompt';
        generateTextBtn.textContent = 'Evaluate';
    }

    // Construct the edit URL using the Drive SDK format
    let url;
    if (data.docId) {
        url = `https://docs.google.com/document/d/${data.docId}/edit?usp=drivesdk`;
    } else if (data.googleDocEditUrl) {
        url = data.googleDocEditUrl.includes('?') 
            ? `${data.googleDocEditUrl}&usp=drivesdk`
            : `${data.googleDocEditUrl}?usp=drivesdk`;
    } else {
        console.error('No document ID or URL found:', data);
        alert('Unable to open document. Please try again later.');
        closeModal();
        return;
    }

    // Set up real-time listener for document updates
    const unsubscribe = db.collection('documents').doc(id).onSnapshot(docSnap => {
        if (docSnap.exists) {
            const docData = docSnap.data();
            let evalHTML = '<span style="font-size:1.1rem;font-weight:500;">';
            if (docData.aiEvaluation && docData.aiEvaluation.evaluation) {
                const evalData = docData.aiEvaluation.evaluation;
                evalHTML += `Accuracy: <b>${evalData.accuracy ?? '-'}</b> | `;
                evalHTML += `Reliability: <b>${evalData.reliability ?? '-'}</b> | `;
                evalHTML += `Complexity: <b>${evalData.complexity ?? '-'}</b> | `;
                evalHTML += `Overall: <b>${evalData.overall ?? '-'}</b>`;
            } else {
                evalHTML += 'This prompt has not yet been evaluated.';
            }
            evalHTML += '</span>';
            const docTitleElem = document.getElementById('doc_title');
            if (docTitleElem) {
                docTitleElem.innerHTML = evalHTML;
            }

            // Update generate text button state based on document status
            if (generateTextBtn) {
                if (docData.textFileRequested) {
                    generateTextBtn.disabled = true;
                    generateTextBtn.title = 'Evaluation in progress...';
                    generateTextBtn.textContent = 'Evaluating...';
                } else {
                    generateTextBtn.disabled = false;
                    generateTextBtn.title = 'Evaluate Prompt';
                    generateTextBtn.textContent = 'Evaluate';
                }
            }
        }
    });

    // Store the unsubscribe function to clean up when modal is closed
    window.currentDocUnsubscribe = unsubscribe;

    // Navigation event listeners
    const prevBtn = document.getElementById('prev_doc_btn');
    const nextBtn = document.getElementById('next_doc_btn');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentDocIndex > 0) {
                const prevId = currentDocList[currentDocIndex - 1];
                const prevData = getDocDataById(prevId);
                if (prevData) openDocument(prevId, prevData);
            }
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentDocIndex < currentDocList.length - 1) {
                const nextId = currentDocList[currentDocIndex + 1];
                const nextData = getDocDataById(nextId);
                if (nextData) openDocument(nextId, nextData);
            }
        };
    }

    try {
        // Configure iframe with additional permissions
        docIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms allow-downloads');
        docIframe.setAttribute('referrerpolicy', 'no-referrer');
        
        // Load the document in the iframe
        docIframe.src = url;

        // Add click outside listener
        docModal.addEventListener('click', handleModalClick);
        
        // Increment view count
        db.collection('documents').doc(id).update({
            views: window.firebase.firestore.FieldValue.increment(1)
        }).catch(error => {
            console.error('Error updating view count:', error);
        });

        // Add event listener for generate text button
        const generateTextBtn = document.getElementById('generate_text_btn');
        if (generateTextBtn) {
            generateTextBtn.onclick = async () => {
                try {
                    await db.collection('documents').doc(id).update({
                        textFileRequested: true,
                        lastRequested: new Date(),
                        status: 'pending'
                    });
                    generateTextBtn.disabled = true;
                    generateTextBtn.title = 'Evaluation in progress...';
                    generateTextBtn.textContent = 'Evaluating...';
                } catch (err) {
                    alert('Failed to request evaluation.');
                    console.error(err);
                }
            };
        }
    } catch (error) {
        console.error('Error opening document:', error);
        alert('Error opening document. Please try again.');
        closeModal();
    }
}

function handleModalClick(event) {
    // Check if the click was outside the modal content or on the first header
    if (event.target === docModal || event.target.closest('.doc_navbar')) {
        closeModal();
    }
}

function closeModal() {
    // Remove active class to trigger transition
    docModal.classList.remove('active');
    
    // Unsubscribe from document updates
    if (window.currentDocUnsubscribe) {
        window.currentDocUnsubscribe();
        window.currentDocUnsubscribe = null;
    }
    
    // Wait for transition to complete before hiding
    setTimeout(() => {
        docModal.style.display = 'none';
        document.body.classList.remove('no-scroll');
        docIframe.src = '';
        docModal.removeEventListener('click', handleModalClick);
    }, 300); // Match this with CSS transition duration
}

async function handleCreatePrompt(titleInput, submitButton) {
    const title = titleInput.value.trim();
    if (!title) {
        alert('Please enter a title');
        return;
    }

    // Store original button text
    const originalText = submitButton.textContent;
    
    try {
        // Disable the button and show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';

        // Step 1: Create Google Doc first
        console.log('Creating Google Doc...');
        const response = await fetch('https://create-doc-183210213696.us-central1.run.app/create_doc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: ''
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create document');
        }

        const data = await response.json();
        console.log('Google Doc created:', data);

        if (!data.success || !data.docId) {
            throw new Error('Invalid response from document creation service');
        }

        // Construct the edit URL with drivesdk parameter
        const editUrl = `https://docs.google.com/document/d/${data.docId}/edit?usp=drivesdk`;
        const viewUrl = `https://docs.google.com/document/d/${data.docId}/preview?usp=drivesdk`;

        // Step 2: Only after successful Google Doc creation, save to Firestore
        const docRef = await db.collection('documents').add({
            title: title,
            docId: data.docId,
            googleDocWebViewUrl: viewUrl,
            googleDocEditUrl: editUrl,
            status: 'draft',
            views: 0,
            createdAt: new Date()
        });

        console.log('Document saved to Firestore with ID:', docRef.id);

        // Send Discord notification
        try {
            const webhookUrl = window.config.discordWebhookUrl;
            if (webhookUrl) {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        embeds: [{
                            title: 'New Prompt Created',
                            description: `A new prompt "${title}" has been created.`,
                            color: 0x00ff00,
                            fields: [
                                {
                                    name: 'View Prompt',
                                    value: viewUrl,
                                    inline: true
                                },
                                {
                                    name: 'Edit Prompt',
                                    value: editUrl,
                                    inline: true
                                }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
            }
        } catch (webhookError) {
            console.error('Failed to send Discord notification:', webhookError);
            // Don't throw the error - we don't want to fail the whole operation if the webhook fails
        }

        // Clear the input
        titleInput.value = '';
        
        // Reload the documents list
        loadDocuments();
        
        // Open the document in the modal
        openDocument(docRef.id, {
            docId: data.docId,
            googleDocEditUrl: editUrl
        });
        
    } catch (error) {
        console.error('Error creating document:', error);
        alert('Error creating document: ' + error.message);
    } finally {
        // Re-enable the button and restore original text
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Utility functions
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateSortIcons() {
    sortButtons.forEach(button => {
        const icon = button.querySelector('.sort_icon');
        if (!icon) return;
        if ((button.classList.contains('sort_by_date') && currentSortField === 'date') ||
            ((button.classList.contains('sort_by_views') || button.classList.contains('sort_by_rank')) && currentSortField === 'views')) {
            icon.textContent = currentSortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward';
        } else {
            icon.textContent = 'unfold_more';
        }
    });
}

function openEvalModal(type, docId) {
    db.collection('documents').doc(docId).get().then(docSnap => {
        if (docSnap.exists && docSnap.data().aiEvaluation && docSnap.data().aiEvaluation.evaluation) {
            const evalData = docSnap.data().aiEvaluation.evaluation;
            document.getElementById(`${type}_modal_content`).textContent = evalData[type] ?? 'This prompt has not yet been evaluated.';
        } else {
            document.getElementById(`${type}_modal_content`).textContent = 'This prompt has not yet been evaluated.';
        }
        document.getElementById(`${type}-modal`).style.display = 'block';
    });
}

// Close evaluation modals
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.close-eval-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            document.getElementById(modalId).style.display = 'none';
        });
    });
});

// Helper to get document data by id from the DOM list
function getDocDataById(docId) {
    const li = Array.from(document.querySelectorAll('.idea_container')).find(li => li.dataset.docId === docId);
    if (!li) return null;
    // You may want to store the data object on the element for efficiency
    return li._docData || null;
}

// Keyboard navigation for modal (left/right arrows)
document.addEventListener('keydown', function(e) {
    if (docModal && docModal.style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            if (currentDocIndex > 0) {
                const prevId = currentDocList[currentDocIndex - 1];
                const prevData = getDocDataById(prevId);
                if (prevData) openDocument(prevId, prevData);
            }
        } else if (e.key === 'ArrowRight') {
            if (currentDocIndex < currentDocList.length - 1) {
                const nextId = currentDocList[currentDocIndex + 1];
                const nextData = getDocDataById(nextId);
                if (nextData) openDocument(nextId, nextData);
            }
        }
    }
}); 
