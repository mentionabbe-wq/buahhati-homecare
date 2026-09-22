import { handleApiError, searchParamsOf, AppError } from '@/lib/api';
import { requireAuth } from '@/lib/rbac';
import { buildReportTable, toCsv, type ReportKind } from '@/services/report.service';
import { buildXlsx } from '@/services/xlsx';
import { todayKey } from '@/lib/datetime';

const KINDS: ReportKind[] = ['reservasi', 'pendapatan', 'terapis', 'layanan'];

/** GET /api/reports/export?kind=reservasi&from=…&to=…&format=csv|xlsx */
export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const params = searchParamsOf(request);
    const kind = (params.get('kind') ?? 'reservasi') as ReportKind;
    if (!KINDS.includes(kind)) throw new AppError('Jenis laporan tidak dikenal', 400);

    const from = params.get('from') ?? todayKey();
    const to = params.get('to') ?? todayKey();
    const format = (params.get('format') ?? 'csv').toLowerCase();

    const table = await buildReportTable(kind, { from, to });
    const filename = `laporan-${kind}-${from}_${to}`;

    if (format === 'xlsx') {
      const buffer = buildXlsx(table.title, [table.headers, ...table.body]);
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    const csv = toCsv(table.headers, table.body);
    return new Response(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
