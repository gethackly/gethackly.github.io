// Renders the ARCHIVE accordion using ArchiveService

(function initArchiveUI() {
    async function archiveBestPromptOfRound() {
        try {
            if (!window.hackly || !window.ArchiveService) return;
            const best = window.hackly.pickBestPrompt && window.hackly.pickBestPrompt();
            if (!best) return;
            // Load content for best prompt
            const content = await window.hackly.fetchBranchContent(best.id);
            const entry = window.ArchiveService.buildArchiveEntry({
                prompt: content || best.content || best.body || best.text || '',
                ai_reply: '(pending)',
                prompt_id: best.id,
                evaluation_id: (best.latest_evaluation && best.latest_evaluation.id) || '',
                selected_model: 'Auto',
                scores: {
                    accuracy: (best.latest_evaluation && (best.latest_evaluation.accuracy ?? 0)) || (best.accuracy ?? 0),
                    reliability: (best.latest_evaluation && (best.latest_evaluation.reliability ?? 0)) || (best.reliability ?? 0),
                    complexity: (best.latest_evaluation && (best.latest_evaluation.complexity ?? 0)) || (best.complexity ?? 0)
                },
                code_link: null
            });
            await window.ArchiveService.saveEntry(entry);
            // Clear projects UI
            window.hackly.clearProjectsUI && window.hackly.clearProjectsUI();
            // Reload archive list
            await loadAndRender();
        } catch (_) {}
    }
    function getArchivePanelContent() {
        return document.querySelector('section.panel[data-panel="archive"] .panel-content');
    }

    function ensureContainer(panelContent) {
        if (!panelContent) return null;
        let container = panelContent.querySelector('#archiveList');
        if (!container) {
            // Clear placeholder content
            panelContent.innerHTML = '';
            container = document.createElement('div');
            container.id = 'archiveList';
            panelContent.appendChild(container);
        }
        return container;
    }

    function renderEmpty(container) {
        if (!container) return;
        const msg = document.createElement('div');
        msg.className = 'panel-info';
        msg.textContent = 'Archive is empty. Best prompts and replies will appear here after each round.';
        container.appendChild(msg);
    }

    function createDetails(indexLabel, entry) {
        const details = document.createElement('details');
        details.className = 'archive-entry';

        const summary = document.createElement('summary');
        summary.textContent = `${indexLabel}`;
        details.appendChild(summary);

        const meta = document.createElement('div');
        meta.className = 'archive-meta';
        const createdAt = entry.created_at || '';
        const round = entry.round_id || '';
        meta.textContent = [createdAt, round].filter(Boolean).join(' — ');
        details.appendChild(meta);

        const promptLabel = document.createElement('div');
        promptLabel.className = 'archive-label';
        promptLabel.textContent = 'Prompt';
        details.appendChild(promptLabel);

        const promptBlock = document.createElement('pre');
        promptBlock.className = 'archive-content';
        promptBlock.textContent = entry.prompt || '';
        details.appendChild(promptBlock);

        const replyLabel = document.createElement('div');
        replyLabel.className = 'archive-label';
        replyLabel.textContent = 'AI Reply';
        details.appendChild(replyLabel);

        const replyBlock = document.createElement('pre');
        replyBlock.className = 'archive-content';
        replyBlock.textContent = entry.ai_reply || '';
        details.appendChild(replyBlock);

        // Add edit button for AI reply
        // Edit button, visible only if user can edit
        const canEdit = window.authHelpers && window.authHelpers.canEdit && window.authHelpers.canEdit();
        if (canEdit) {
            const editButton = document.createElement('button');
            editButton.className = 'archive-edit-btn';
            editButton.textContent = 'Edit AI Reply';
            editButton.onclick = () => editAIReply(entry.id, entry.ai_reply || '');
            details.appendChild(editButton);
        }

        if (entry.code_link) {
            const link = document.createElement('a');
            link.href = entry.code_link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'View code changes';
            link.className = 'archive-link';
            details.appendChild(link);
        }

        return details;
    }

    async function loadAndRender() {
        const panelContent = getArchivePanelContent();
        const container = ensureContainer(panelContent);
        if (!container) return;
        
        // Don't clear container - preserve existing entries
        if (!window.ArchiveService) { 
            if (!container.children.length) renderEmpty(container); 
            return; 
        }
        
        const items = await window.ArchiveService.listEntries(200);
        if (!items || items.length === 0) { 
            if (!container.children.length) renderEmpty(container); 
            return; 
        }

        // Show in chronological order (oldest first)
        const chronological = items.slice().reverse();
        const total = chronological.length;

        // Only add new entries that aren't already displayed
        const existingIds = new Set();
        Array.from(container.children).forEach(child => {
            if (child.dataset.entryId) {
                existingIds.add(child.dataset.entryId);
            }
        });

        chronological.forEach((entry, idx) => {
            if (!existingIds.has(entry.id)) {
                const roundNumber = entry.round_number || (total - idx);
                const label = `Round ${roundNumber} - Instruction ${total - idx}`;
                const details = createDetails(label, entry);
                details.dataset.entryId = entry.id;
                container.appendChild(details);
            }
        });
    }

    async function editAIReply(entryId, currentReply) {
        const newReply = prompt('Edit AI Reply:', currentReply);
        if (newReply !== null && newReply !== currentReply) {
            try {
                const success = await window.ArchiveService.updateEntry(entryId, { 
                    ai_reply: newReply 
                });
                if (success) {
                    // Update the display immediately
                    const entryElement = document.querySelector(`[data-entry-id="${entryId}"]`);
                    if (entryElement) {
                        const replyBlock = entryElement.querySelector('.archive-content');
                        if (replyBlock) {
                            replyBlock.textContent = newReply;
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to update AI reply:', e);
            }
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        loadAndRender().catch(() => {});
    });

    // Re-run when Firebase is ready
    window.addEventListener('firebase-ready', () => {
        loadAndRender().catch(() => {});
    });

    // Listen for round end (from Timer test) and archive best prompt
    window.addEventListener('round-ended', () => {
        archiveBestPromptOfRound().catch(() => {});
    });
})();


