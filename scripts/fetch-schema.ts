import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { checkbox } from '@inquirer/prompts';

config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const bases = [
	{ name: 'Learners', id: process.env.AIRTABLE_BASE_ID_LEARNERS },
	{ name: 'Learner Feedback', id: process.env.AIRTABLE_BASE_ID_FEEDBACK },
];

interface AirtableField {
	name: string;
	type: string;
}

interface AirtableTable {
	name: string;
	fields: AirtableField[];
}

interface AirtableTablesResponse {
	tables: AirtableTable[];
}

async function fetchTables(baseId: string): Promise<AirtableTable[]> {
	const response = await fetch(
		`https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
		{ headers: { Authorization: `Bearer ${apiKey}` } },
	);
	const data: AirtableTablesResponse = await response.json();
	return data.tables.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
	let output = '# Airtable Schema\n\n';

	for (const base of bases) {
		console.log(`\nFetching tables from ${base.name}...`);
		const tables = await fetchTables(base.id!);

		const selected = await checkbox<AirtableTable>({
			message: `Select tables from ${base.name}:`,
			choices: tables.map(t => ({
				name: t.name,
				value: t,
			})),
			loop: false,
			pageSize: 30,
		});

		for (const table of selected) {
			output += `## ${base.name} / ${table.name}\n\n`;
			output += '| Field | Type |\n';
			output += '|-------|------|\n';

			for (const field of table.fields) {
				output += `| ${field.name} | ${field.type} |\n`;
			}
			output += '\n';
		}
	}

	writeFileSync('scripts/fetch-schema-output.md', output);
	console.log(`\nWritten to scripts/fetch-schema-output.md`);
}

main().catch(console.error);
