import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

const FROM_EMAIL = 'Apprentice Pulse <noreply@resend.dev>';

interface SendMagicLinkResult {
	success: boolean;
	error?: string;
}

export async function sendMagicLinkEmail(
	to: string,
	magicLinkUrl: string,
	type: 'staff' | 'student',
): Promise<SendMagicLinkResult> {
	const subject = type === 'staff'
		? 'Staff Login - Apprentice Pulse'
		: 'Student Login - Apprentice Pulse';

	const html = `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h1 style="color: #333;">Apprentice Pulse</h1>
			<p>Click the button below to log in:</p>
			<a href="${magicLinkUrl}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
				Log in
			</a>
			<p style="color: #666; font-size: 14px;">
				This link expires in 15 minutes.<br>
				If you didn't request this, you can safely ignore this email.
			</p>
			<p style="color: #999; font-size: 12px;">
				Or copy this link: ${magicLinkUrl}
			</p>
		</div>
	`;

	const text = `
Apprentice Pulse

Click this link to log in:
${magicLinkUrl}

This link expires in 15 minutes.
If you didn't request this, you can safely ignore this email.
	`.trim();

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject,
			html,
			text,
		});

		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}

		return { success: true };
	}
	catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: 'Failed to send email' };
	}
}
