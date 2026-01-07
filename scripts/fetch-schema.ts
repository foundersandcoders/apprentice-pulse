import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { checkbox } from '@inquirer/prompts';

config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const bases = [
	{ name: 'Learners', id: process.env.AIRTABLE_BASE_ID_LEARNERS },
	// { name: 'Learner Feedback', id: process.env.AIRTABLE_BASE_ID_FEEDBACK },
];

interface AirtableField {
	id: string;
	name: string;
	type: string;
}

interface AirtableTable {
	id: string;
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

function getTimestamp(): string {
	return new Date().toISOString().replace(/[T:]/g, '-').substring(0, 19);
}

async function main() {
	const timestamp = getTimestamp();
	const outputFile = `scripts/schema-${timestamp}.md`;

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
			output += `Table ID: \`${table.id}\`\n\n`;
			output += '| Field | ID | Type |\n';
			output += '|-------|-----|------|\n';

			for (const field of table.fields) {
				output += `| ${field.name} | \`${field.id}\` | ${field.type} |\n`;
			}
			output += '\n';
		}
	}

	writeFileSync(outputFile, output);
	console.log(`\nWritten to ${outputFile}`);
}

main().catch(console.error);
