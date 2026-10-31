import { listReports } from '../../../src/store.js';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json(await listReports());
}
