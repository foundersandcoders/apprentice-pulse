import jwt from 'jsonwebtoken';
import { AUTH_SECRET } from '$env/static/private';

export type UserType = 'staff' | 'student';

interface TokenPayload {
	email: string;
	type: UserType;
}

const TOKEN_EXPIRY = '15m';

export function generateMagicToken(email: string, type: UserType): string {
	return jwt.sign({ email, type }, AUTH_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyMagicToken(token: string): TokenPayload | null {
	try {
		const decoded = jwt.verify(token, AUTH_SECRET) as TokenPayload;
		return { email: decoded.email, type: decoded.type };
	}
	catch {
		return null;
	}
}
