// ArchiveService — defines archive entry schema and round helpers
// Exposes a small API on window.ArchiveService for later use by UI/automation

(function initArchiveService() {
    if (window.ArchiveService) return; // idempotent

    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

    function pad2(n) { return String(n).padStart(2, '0'); }

    function getRoundStartUtc(date) {
        const d = date ? new Date(date) : new Date();
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        const day = d.getUTCDate();
        const hour = d.getUTCHours();
        const bucketStartHour = Math.floor(hour / 8) * 8; // 0, 8, 16
        return new Date(Date.UTC(year, month, day, bucketStartHour, 0, 0, 0));
    }

    function getNextRoundStartUtc(date) {
        const start = getRoundStartUtc(date);
        return new Date(start.getTime() + EIGHT_HOURS_MS);
    }

    function getCurrentRoundMeta(date) {
        const start = getRoundStartUtc(date);
        const end = getNextRoundStartUtc(start);
        const id = formatRoundId(start);
        
        // Get sequential round number (1, 2, 3... forever)
        const roundNumber = getSequentialRoundNumber(start);
        
        return { 
            id, 
            round_number: roundNumber,
            start_iso: start.toISOString(), 
            end_iso: end.toISOString() 
        };
    }

    async function getSequentialRoundNumber(startDate) {
        try {
            const col = getCollectionRef();
            if (!col) return 1;
            
            // Count existing rounds to get next number
            const snap = await col.get();
            return snap.size + 1;
        } catch (_) {
            return 1;
        }
    }

    function formatRoundId(startDateUtc) {
        const d = startDateUtc instanceof Date ? startDateUtc : getRoundStartUtc(startDateUtc);
        const y = d.getUTCFullYear();
        const m = pad2(d.getUTCMonth() + 1);
        const day = pad2(d.getUTCDate());
        const h = pad2(d.getUTCHours());
        // Example: R-2025-08-25-16Z
        return `R-${y}-${m}-${day}-${h}Z`;
    }

    async function buildArchiveEntry(input) {
        const now = new Date();
        const round = await getCurrentRoundMeta(now);
        const scores = normalizeScores(input && input.scores);

        return {
            // Round metadata
            round_id: round.id,
            round_number: round.round_number,
            round_started_at: round.start_iso,
            round_ends_at: round.end_iso,

            // Timestamps
            created_at: now.toISOString(),

            // Prompt/evaluation
            prompt: safeStr(input && input.prompt),
            ai_reply: safeStr(input && input.ai_reply),
            prompt_id: safeStr(input && input.prompt_id),
            evaluation_id: safeStr(input && input.evaluation_id),
            selected_model: safeStr(input && input.selected_model),

            // Scores
            score_total: toNumber(input && (input.score_total != null ? input.score_total : scores.total)),
            scores,

            // Links (optional)
            code_link: safeStr(input && input.code_link) || null
        };
    }

    function normalizeScores(s) {
        const accuracy = toNumber(s && s.accuracy);
        const reliability = toNumber(s && s.reliability);
        const complexity = toNumber(s && s.complexity);
        const total = [accuracy, reliability, complexity]
            .map(v => (isFinite(v) ? v : 0))
            .reduce((a, b) => a + b, 0);
        return { accuracy, reliability, complexity, total };
    }

    function toNumber(v) {
        const n = Number(v);
        return isFinite(n) ? n : 0;
    }

    function safeStr(v) {
        if (v == null) return '';
        return String(v);
    }

    function getCollectionRef() {
        if (!window.db || !window.db.collection) return null;
        return window.db.collection('archive_entries');
    }

    async function saveEntry(entry) {
        const col = getCollectionRef();
        if (!col) return null;
        try {
            const ref = await col.add(entry);
            try { console.log('[ArchiveService] Saved archive entry', ref.id); } catch (_) {}
            return ref;
        } catch (e) {
            try { console.warn('[ArchiveService] Failed to save archive entry', e); } catch (_) {}
            return null;
        }
    }

    async function updateEntry(entryId, updates) {
        const col = getCollectionRef();
        if (!col) return null;
        try {
            await col.doc(entryId).update(updates);
            try { console.log('[ArchiveService] Updated archive entry', entryId); } catch (_) {}
            return true;
        } catch (e) {
            try { console.warn('[ArchiveService] Failed to update archive entry', e); } catch (_) {}
            return false;
        }
    }

    async function listEntries(limit = 100) {
        const col = getCollectionRef();
        if (!col) return [];
        try {
            // Most recent first
            const snap = await col
                .orderBy('created_at', 'desc')
                .limit(limit)
                .get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...(d.data() || {}) }));
            return items;
        } catch (_) {
            return [];
        }
    }

    window.ArchiveService = {
        getCurrentRoundMeta,
        getRoundStartUtc,
        getNextRoundStartUtc,
        formatRoundId,
        buildArchiveEntry,
        saveEntry,
        updateEntry,
        listEntries
    };
})();


