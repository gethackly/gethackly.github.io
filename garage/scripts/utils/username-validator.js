// Username validation service
class UsernameValidator {
	constructor() {
		// Reserved usernames that users can't use
		this.reservedUsernames = [
			'admin', 'administrator', 'root', 'superuser', 'moderator',
			'test', 'testing', 'demo', 'example', 'sample',
			'guest', 'anonymous', 'user', 'account', 'profile',
			'login', 'signup', 'signin', 'logout', 'auth',
			'firebase', 'google', 'github', 'discord', 'twitter',
			'facebook', 'instagram', 'youtube', 'twitch', 'reddit',
			'help', 'support', 'contact', 'about', 'terms',
			'privacy', 'policy', 'legal', 'copyright', 'trademark',
			'null', 'undefined', 'true', 'false', 'nan',
			'www', 'http', 'https', 'ftp', 'mailto',
			'api', 'app', 'web', 'site', 'page',
			'home', 'index', 'main', 'default', 'error',
			'404', '500', '403', '401', '400'
		];

		// Comprehensive profanity and inappropriate content filter
		this.profanityFilter = [
			// Explicit profanity
			'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'dick', 'cock', 'ass', 'asshole',
			'bastard', 'whore', 'slut', 'motherfucker', 'fucker', 'fuckme', 'fuckyou',
			'fuckoff', 'fuckin', 'fucking', 'shitty', 'bitchy', 'cunty', 'dicky',
			
			// Offensive variations
			'fuk', 'fukin', 'fuking', 'fuq', 'fuqin', 'fuqing', 'shyt', 'sh1t', 'sh1ty',
			'btch', 'b1tch', 'b1tchy', 'cnt', 'c0nt', 'c0nty', 'pssy', 'p0ssy', 'p0ssy',
			'dck', 'd1ck', 'd1cky', 'c0ck', 'c0cky', 'assh0le', 'assh0l3', 'b4stard',
			'wh0re', 'wh0r3', 'sl0t', 'sl0tty', 'm0therfucker', 'm0th3rfucker',
			
			// Common offensive terms
			'nigger', 'n1gger', 'n1gg3r', 'n1gga', 'n1gg4', 'faggot', 'f4ggot', 'f4gg0t',
			'retard', 'ret4rd', 'ret4rd3d', 'idiot', '1diot', '1d10t', 'stupid', 'st00pid',
			'dumb', 'dumbass', 'dumb4ss', 'moron', 'm0ron', 'm0r0n',
			
			// Sexual/inappropriate content
			'sex', 'sexy', 'sexual', 'porn', 'p0rn', 'p0rno', 'nude', 'nud3', 'nud1st',
			'boobs', 'b00bs', 'tits', 't1ts', 't1tty', 'vagina', 'v4gina', 'v4g1na',
			'penis', 'p3nis', 'p3n1s', 'cock', 'c0ck', 'c0cky', 'dildo', 'd1ldo',
			
			// Violence/hate speech
			'kill', 'k1ll', 'k1ller', 'murder', 'murd3r', 'murd3r3r', 'death', 'd34th',
			'hate', 'h4te', 'h4t3', 'racist', 'r4cist', 'r4c1st', 'nazi', 'n4zi', 'n4z1',
			'terrorist', 't3rrorist', 't3rr0r1st', 'bomb', 'b0mb', 'b0mb3r',
			
			// Drug references
			'drug', 'dr0g', 'dr0g3', 'cocaine', 'c0caine', 'c0c41ne', 'heroin', 'h3roin',
			'h3r01n', 'marijuana', 'm4rijuana', 'm4r1juana', 'weed', 'w33d', 'w33d1e',
			'acid', '4cid', '4c1d', 'lsd', 'l5d', 'ecstasy', '3cstasy', '3cst4sy',
			
			// Common offensive abbreviations
			'wtf', 'wth', 'omg', 'lol', 'rofl', 'lmfao', 'stfu', 'gtfo', 'kys', 'kms',
			'fml', 'smh', 'tbh', 'imo', 'afaik', 'btw', 'fyi', 'idk', 'ttyl', 'brb',
			
			// Offensive gaming terms
			'noob', 'n00b', 'n0ob', 'newb', 'n3wb', 'n3wbie', 'camper', 'c4mper',
			'cheater', 'ch34ter', 'hacker', 'h4cker', 'h4ck3r', 'script', 'scr1pt',
			'aimbot', '41mbot', 'wallhack', 'w4llh4ck', 'speedhack', 'sp33dh4ck'
		];
	}

	// Check if username is valid format
	validateFormat(username) {
		// Check length
		if (username.length < 3 || username.length > 20) {
			return { valid: false, error: 'Username must be 3-20 characters long' };
		}

		// Check format (letters, numbers, underscores only)
		if (!/^[a-zA-Z0-9_]+$/.test(username)) {
			return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
		}

		// Check if starts with letter or number (not underscore)
		if (!/^[a-zA-Z0-9]/.test(username)) {
			return { valid: false, error: 'Username must start with a letter or number' };
		}

		// Check if ends with letter or number (not underscore)
		if (!/[a-zA-Z0-9]$/.test(username)) {
			return { valid: false, error: 'Username must end with a letter or number' };
		}

		// Check for consecutive underscores
		if (username.includes('__')) {
			return { valid: false, error: 'Username cannot contain consecutive underscores' };
		}

		return { valid: true };
	}

	// Check if username is reserved
	validateReserved(username) {
		const lowerUsername = username.toLowerCase();
		
		if (this.reservedUsernames.includes(lowerUsername)) {
			return { valid: false, error: 'This username is reserved and cannot be used' };
		}

		return { valid: true };
	}

	// Check if username contains profanity
	validateProfanity(username) {
		const lowerUsername = username.toLowerCase();
		
		for (const word of this.profanityFilter) {
			if (lowerUsername.includes(word)) {
				return { valid: false, error: 'Username contains inappropriate content' };
			}
		}

		return { valid: true };
	}

	// Check if username is available (async - checks Firestore)
	async validateAvailability(username) {
		try {
			if (!firebase || !firebase.firestore) {
				return { valid: true, error: null }; // Skip if Firebase not available
			}

			const db = firebase.firestore();
			const userDoc = await db.collection('users').where('username', '==', username).limit(1).get();
			
			if (!userDoc.empty) {
				return { valid: false, error: 'Username is already taken' };
			}

			return { valid: true, error: null };
		} catch (error) {
			console.warn('Could not check username availability:', error);
			return { valid: true, error: null }; // Assume available if check fails
		}
	}

	// Comprehensive username validation
	async validateUsername(username) {
		// Check format first
		const formatCheck = this.validateFormat(username);
		if (!formatCheck.valid) {
			return formatCheck;
		}

		// Check reserved words
		const reservedCheck = this.validateReserved(username);
		if (!reservedCheck.valid) {
			return reservedCheck;
		}

		// Check profanity
		const profanityCheck = this.validateProfanity(username);
		if (!profanityCheck.valid) {
			return profanityCheck;
		}

		// Check availability (async)
		const availabilityCheck = await this.validateAvailability(username);
		if (!availabilityCheck.valid) {
			return availabilityCheck;
		}

		return { valid: true, error: null };
	}

	// Generate username suggestions
	generateSuggestions(baseUsername) {
		const suggestions = [];
		const base = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
		
		if (base.length >= 3) {
			// Add numbers
			for (let i = 1; i <= 5; i++) {
				suggestions.push(`${base}${i}`);
			}
			
			// Add underscores
			suggestions.push(`${base}_`);
			suggestions.push(`_${base}`);
			
			// Add common suffixes
			const suffixes = ['dev', 'user', 'pro', 'cool', 'awesome', '2024', '23', '24'];
			for (const suffix of suffixes) {
				suggestions.push(`${base}_${suffix}`);
			}
		}

		return suggestions.slice(0, 8); // Limit to 8 suggestions
	}

	// Real-time validation with suggestions
	async validateWithSuggestions(username) {
		const validation = await this.validateUsername(username);
		
		if (!validation.valid) {
			const suggestions = this.generateSuggestions(username);
			return {
				...validation,
				suggestions: suggestions
			};
		}

		return validation;
	}
}

// Create global instance
window.usernameValidator = new UsernameValidator();



