// Rebuilt Leaderboard UI with real-time updates and collection fallback

class LeaderboardManager {
    constructor() {
        this.inited = false;
        this.unsub = null;
        this.items = [];
    }

    init() {
        if (this.inited) return;
        this.bindModalEvents();
        const listEl = document.getElementById('leaderboardList');
        if (!listEl) return;
        this.inited = true;

        // Show loading state
        this.setMessage('Loading leaderboard...');

        const start = () => {
            if (!window.db || !window.db.collection) {
                // Wait for Firebase compat
                setTimeout(start, 100);
                return;
            }
            this.startListening();
        };

        // If firebase is already ready, start, otherwise wait for event
        if (window.firebaseInitialized) start();
        else window.addEventListener('firebase-ready', start, { once: true });
    }

    bindModalEvents() {
        const infoBtn = document.getElementById('rankingInfoBtn');
        const modal = document.getElementById('rankingInfoModal');
        const closeBtn = document.getElementById('rankingInfoClose');




        if (infoBtn) {
            infoBtn.addEventListener('click', () => {

                if (modal) {
                    modal.style.display = 'block';

                }
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {

                if (modal) {
                    modal.style.display = 'none';

                }
            });
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {

                    modal.style.display = 'none';
                }
            });
        }
    }

    startListening() {
        // Prefer public leaderboard mirror; fallback to users
        try {
            const col = window.db.collection('leaderboard').orderBy('points_total', 'desc').limit(100);
            this.bindSnapshot(col, () => {
                // Fallback only if first attempt produced no items
                if (!this.items.length) this.listenUsersFallback();
            });
        } catch (e) {
            console.warn('⚠️ Leaderboard: failed on leaderboard collection, falling back to users:', e);
            this.listenUsersFallback();
        }
    }

    listenUsersFallback() {
        try {
            const col = window.db.collection('users').orderBy('points_total', 'desc').limit(100);
            this.bindSnapshot(col);
        } catch (e) {
            console.error('❌ Leaderboard: failed to listen on users collection:', e);
            this.setMessage('Failed to load leaderboard');
        }
    }

    bindSnapshot(query, onAfterFirst) {
        if (this.unsub) {
            try { this.unsub(); } catch (_) {}
            this.unsub = null;
        }

        let first = true;
        this.unsub = query.onSnapshot((snap) => {
            const next = [];
            snap.forEach((d) => {
                const data = d.data() || {};
                next.push({
                    user_id: data.user_id || d.id,
                    points_total: Number(data.points_total || 0),
                    username: data.username || '',
                    display_name: data.display_name || data.displayName || '',
                    github_username: data.github_username || data.githubUsername || '',
                    photo_url: data.photo_url || data.photoURL || '',
                    email: data.email || '',
                });
            });

            // Sort defensively client-side as well
            next.sort((a, b) => (b.points_total || 0) - (a.points_total || 0));
            this.items = next;
            if (!this.items.length) this.setMessage('No scores yet. Evaluate prompts to earn points.');
            else this.render(this.items);

            // Dispatch event for other components to know leaderboard updated
            try {
                window.dispatchEvent(new CustomEvent('leaderboard-updated', { 
                    detail: { items: this.items } 
                }));
            } catch (e) {
                console.warn('Could not dispatch leaderboard-updated event:', e);
            }

            if (first) { first = false; if (onAfterFirst) onAfterFirst(); }
        }, (err) => {
            console.error('❌ Leaderboard snapshot error:', err);
            this.setMessage('Failed to load leaderboard');
        });
    }

    setMessage(text) {
        const listEl = document.getElementById('leaderboardList');
        if (!listEl) return;
        listEl.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'leaderboard-empty';
        div.textContent = text;
        listEl.appendChild(div);
    }

    getDisplayName(it) {
        const uname = it.username || it.display_name || '';
        if (uname && uname !== it.email) return uname;
        return it.email || '—';
    }

    render(items) {
        const listEl = document.getElementById('leaderboardList');
        if (!listEl) return;
        listEl.innerHTML = '';

        let rank = 0;
        for (const it of items) {
            rank += 1;
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            const username = this.getDisplayName(it);
            const photo = it.photo_url || '';
            const points = Number(it.points_total || 0);
            row.innerHTML = `
                <div class="leaderboard-col leaderboard-col-rank">#${rank}</div>
                <div class="leaderboard-col leaderboard-col-user">
                    ${photo ? `<img class="lb-avatar" src="${photo}" alt="" />` : ''}
                    <span class="lb-name">${username}</span>
                </div>
                <div class="leaderboard-col leaderboard-col-points">${points.toFixed(1)}</div>
            `;
            listEl.appendChild(row);
        }
    }
}

// Expose a singleton for PanelManager
window.leaderboardManager = new LeaderboardManager();
