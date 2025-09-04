// Authentication service with all common Firebase auth methods
// Uses global Firebase object from CDN

class AuthService {
	constructor() {
		this.currentUser = null;
		this.authStateListeners = [];
		
			// Set up auth state listener
	firebase.auth().onAuthStateChanged(async (user) => {
		if (user) {
			try {
				const db = firebase.firestore();
				const userRef = db.collection('users').doc(user.uid);
				const userDoc = await userRef.get();

				if (userDoc.exists) {

					const userData = userDoc.data();
					// Enhance user object with Firestore data - prioritize githubUsername
					user.username = userData.githubUsername || userData.username || user.username;
					// Note: Cannot set displayName directly on user object as it's read-only
				} else {
					// User is authenticated, but no user document exists. Create one.
					console.warn('⚠️ AuthService: User document not found. Creating one now.');
					
					// Determine the best possible username from the auth object
					let username = user.displayName; // From Google/GitHub display name
					
					// For GitHub users, prioritize the display name (which is usually the username)
					const githubProvider = user.providerData.find(p => p.providerId === 'github.com');
					if (githubProvider) {
						// Use GitHub displayName (username) - avoid using uid as it's numeric
						username = githubProvider.displayName || username;
					}
					
					// If still no username, use a generic fallback instead of email
					if (!username) {
						username = 'user';
					}

					const newUserPayload = {
						username: username,
						email: user.email,
						displayName: user.displayName,
						createdAt: firebase.firestore.FieldValue.serverTimestamp()
					};

					await userRef.set(newUserPayload);
					
					// Enhance the user object with the new data
					user.username = username;
					
					// Notify listeners again with updated username
					this.notifyAuthStateListeners(user);
				}
			} catch (error) {
				console.error('❌ AuthService: Error handling user document:', error);
			}
		}
		this.currentUser = user;
		this.notifyAuthStateListeners(user);
	});
	}



	// Sign in with GitHub
	async signInWithGitHub() {
		try {
			const provider = new firebase.auth.GithubAuthProvider();
			// Add scopes for additional GitHub permissions
			provider.addScope('read:user');
			provider.addScope('user:email');
			
			const result = await firebase.auth().signInWithPopup(provider);
			
			// Get additional GitHub info including username
			if (result.additionalUserInfo && result.additionalUserInfo.profile) {
				const githubProfile = result.additionalUserInfo.profile;
				// Update user profile with GitHub username
				await result.user.updateProfile({
					displayName: githubProfile.name || githubProfile.login,
					photoURL: result.user.photoURL || githubProfile.avatar_url
				});
				
				// Store GitHub username in custom claims or user metadata
				result.user.githubUsername = githubProfile.login;
				// Note: Cannot set displayName directly on user object as it's read-only
				
				// Also store in Firestore for easy access
				try {
					const db = firebase.firestore();
					await db.collection('users').doc(result.user.uid).set({
						username: githubProfile.login,
						email: result.user.email,
						githubUsername: githubProfile.login,
						createdAt: firebase.firestore.FieldValue.serverTimestamp()
					}, { merge: true });
				} catch (error) {
					console.warn('Could not store GitHub user data in Firestore:', error);
				}
			}
			
			return { success: true, user: result.user };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}


	// Sign out
	async signOut() {
		try {
			await firebase.auth().signOut();
			return { success: true };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}



	// Get current user
	getCurrentUser() {
		return this.currentUser;
	}

	// Check if user is authenticated
	isAuthenticated() {
		return !!this.currentUser;
	}

	// Add auth state listener
	addAuthStateListener(listener) {
		this.authStateListeners.push(listener);
		// Call immediately if user is already available
		if (this.currentUser) {
			listener(this.currentUser);
		}
	}

	// Remove auth state listener
	removeAuthStateListener(listener) {
		const index = this.authStateListeners.indexOf(listener);
		if (index > -1) {
			this.authStateListeners.splice(index, 1);
		}
	}

	// Notify all listeners
	notifyAuthStateListeners(user) {
		this.authStateListeners.forEach(listener => {
			try {
				listener(user);
			} catch (error) {
				console.error('Auth state listener error:', error);
			}
		});
	}

	// Update user profile
	async updateProfile(updates) {
		try {
			await this.currentUser.updateProfile(updates);
			return { success: true };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	// Get user token
	async getToken(forceRefresh = false) {
		try {
			return await this.currentUser.getIdToken(forceRefresh);
		} catch (error) {
			return null;
		}
	}
}

// Create global instance
window.authService = new AuthService();

