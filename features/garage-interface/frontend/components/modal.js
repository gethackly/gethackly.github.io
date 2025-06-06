class ModalSystem {
    constructor() {
        this.modals = {
            document: new DocumentModal(),
            error: new ErrorModal(),
            loading: new LoadingModal()
        };
        this.activeModal = null;
    }

    show(type, data = {}) {
        if (!this.modals[type]) {
            console.error(`Modal type ${type} not found`);
            return;
        }
        this.activeModal = this.modals[type];
        this.activeModal.show(data);
    }

    hide(type) {
        if (this.activeModal) {
            this.activeModal.hide();
            this.activeModal = null;
        }
    }
}

class BaseModal {
    constructor() {
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal';
        document.body.appendChild(this.modalElement);
    }

    show(data) {
        this.modalElement.style.display = 'flex';
        this.render(data);
    }

    hide() {
        this.modalElement.style.display = 'none';
    }

    render(data) {
        // To be implemented by subclasses
    }
}

class DocumentModal extends BaseModal {
    render(data) {
        this.modalElement.innerHTML = `
            <div class="modal-content">
                <h2>${data.title || 'Document'}</h2>
                <div class="document-content">${data.content || ''}</div>
                <button class="close-button">Close</button>
            </div>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeButton = this.modalElement.querySelector('.close-button');
        closeButton.addEventListener('click', () => this.hide());
    }
}

class ErrorModal extends BaseModal {
    render(data) {
        this.modalElement.innerHTML = `
            <div class="modal-content error">
                <h2>Error</h2>
                <p>${data.message || 'An error occurred'}</p>
                <button class="close-button">Close</button>
            </div>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeButton = this.modalElement.querySelector('.close-button');
        closeButton.addEventListener('click', () => this.hide());
    }
}

class LoadingModal extends BaseModal {
    render() {
        this.modalElement.innerHTML = `
            <div class="modal-content loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

export default ModalSystem; 