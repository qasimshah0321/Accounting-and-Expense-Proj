import cron, { ScheduledTask } from 'node-cron';
import { pool } from '../config/database';
import * as recurring from '../modules/recurring/recurring.service';

// ─── Job Logging ──────────────────────────────────────────────────────────────

interface JobRunHandle {
  id: number | null;
}

const startJobLog = async (jobName: string): Promise<JobRunHandle> => {
  try {
    const [result] = await pool.query(
      `INSERT INTO scheduler_job_log (job_name, started_at) VALUES (?, NOW())`,
      [jobName]
    );
    const insertId = (result as { insertId?: number }).insertId ?? null;
    return { id: insertId };
  } catch (err) {
    console.error(`[scheduler] failed to write start log for ${jobName}:`, err);
    return { id: null };
  }
};

const completeJobLog = async (
  handle: JobRunHandle,
  recordsAffected: number,
  errorMessage?: string
): Promise<void> => {
  if (!handle.id) return;
  try {
    await pool.query(
      `UPDATE scheduler_job_log
         SET completed_at = NOW(), records_affected = ?, error_message = ?
       WHERE id = ?`,
      [recordsAffected, errorMessage || null, handle.id]
    );
  } catch (err) {
    console.error('[scheduler] failed to write completion log:', err);
  }
};

// ─── Job 1: Update overdue payment statuses ──────────────────────────────────

interface UpdateResult {
  affectedRows: number;
}

export const runOverdueStatusUpdate = async (): Promise<{ invoices: number; bills: number }> => {
  const handle = await startJobLog('overdue_status_update');
  const startedAt = new Date().toISOString();
  console.log(`[scheduler] [${startedAt}] running: overdue_status_update`);
  let invoiceCount = 0;
  let billCount = 0;
  let errMsg: string | undefined;
  try {
    const [invRes] = await pool.query(
      `UPDATE invoices
         SET payment_status = 'overdue', updated_at = NOW()
       WHERE payment_status = 'unpaid'
         AND due_date < CURDATE()
         AND status IN ('sent','approved')
         AND deleted_at IS NULL`
    );
    invoiceCount = (invRes as UpdateResult).affectedRows || 0;

    const [billRes] = await pool.query(
      `UPDATE bills
         SET payment_status = 'overdue', updated_at = NOW()
       WHERE payment_status = 'unpaid'
         AND due_date < CURDATE()
         AND status IN ('approved','posted')
         AND deleted_at IS NULL`
    );
    billCount = (billRes as UpdateResult).affectedRows || 0;

    console.log(
      `[scheduler] overdue_status_update completed: invoices=${invoiceCount}, bills=${billCount}`
    );
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
    console.error('[scheduler] overdue_status_update failed:', err);
  } finally {
    await completeJobLog(handle, invoiceCount + billCount, errMsg);
  }
  return { invoices: invoiceCount, bills: billCount };
};

// ─── Job 2: Process due recurring documents ──────────────────────────────────

interface RecurringRow {
  id: string;
  company_id: string;
  created_by: string | null;
}

export const runRecurringProcessor = async (): Promise<{ generated: number; failed: number; companies: number }> => {
  const handle = await startJobLog('recurring_documents');
  const startedAt = new Date().toISOString();
  console.log(`[scheduler] [${startedAt}] running: recurring_documents`);
  let generated = 0;
  let failed = 0;
  const companies = new Set<string>();
  let errMsg: string | undefined;

  try {
    // Find all recurring documents whose next_run_date is today or earlier and that
    // are still active (not yet exhausted/expired).
    const [rows] = await pool.query(
      `SELECT id, company_id, created_by
       FROM recurring_documents
       WHERE is_active = 1
         AND deleted_at IS NULL
         AND next_run_date <= CURDATE()`
    );

    const due = rows as RecurringRow[];
    for (const rec of due) {
      companies.add(rec.company_id);
      const userId = rec.created_by || rec.id; // fallback — generateDocument tolerates a non-FK userId
      try {
        await recurring.generateDocument(rec.company_id, userId, rec.id);
        generated++;
      } catch (err) {
        failed++;
        console.error(
          `[scheduler] recurring_documents: failed to generate for id=${rec.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(
      `[scheduler] recurring_documents completed: due=${due.length}, generated=${generated}, failed=${failed}, companies=${companies.size}`
    );
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
    console.error('[scheduler] recurring_documents failed:', err);
  } finally {
    await completeJobLog(handle, generated, errMsg);
  }
  return { generated, failed, companies: companies.size };
};

// ─── Job 3: Weekly heartbeat ─────────────────────────────────────────────────

export const runHeartbeat = async (): Promise<void> => {
  const handle = await startJobLog('weekly_heartbeat');
  let errMsg: string | undefined;
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n FROM companies WHERE is_active = 1`
    );
    const n = (rows as Array<{ n: number }>)[0]?.n || 0;
    console.log(
      `[scheduler] weekly heartbeat OK at ${new Date().toISOString()} — ${n} active companies`
    );
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
    console.error('[scheduler] heartbeat failed:', err);
  } finally {
    await completeJobLog(handle, 0, errMsg);
  }
};

// ─── Top-level scheduler ─────────────────────────────────────────────────────

const tasks: ScheduledTask[] = [];

export const startScheduler = (): void => {
  if (tasks.length) {
    console.warn('[scheduler] already started — skipping');
    return;
  }

  // 06:00 UTC daily — overdue rollover
  tasks.push(
    cron.schedule(
      '0 6 * * *',
      () => { runOverdueStatusUpdate().catch((e) => console.error('[scheduler] uncaught overdue err', e)); },
      { timezone: 'UTC' }
    )
  );

  // 06:05 UTC daily — process recurring docs
  tasks.push(
    cron.schedule(
      '5 6 * * *',
      () => { runRecurringProcessor().catch((e) => console.error('[scheduler] uncaught recurring err', e)); },
      { timezone: 'UTC' }
    )
  );

  // 03:00 UTC every Sunday — heartbeat
  tasks.push(
    cron.schedule(
      '0 3 * * 0',
      () => { runHeartbeat().catch((e) => console.error('[scheduler] uncaught heartbeat err', e)); },
      { timezone: 'UTC' }
    )
  );

  console.log('[scheduler] started 3 cron jobs (UTC): 0 6 * * *, 5 6 * * *, 0 3 * * 0');
};

export const stopScheduler = (): void => {
  for (const t of tasks) {
    try { t.stop(); } catch { /* noop */ }
  }
  tasks.length = 0;
  console.log('[scheduler] stopped');
};
