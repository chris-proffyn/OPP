/**
 * Admin Test Users: bulk create and bulk delete test users via Edge Functions.
 * Route: /admin/test-users. Spec: OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §10, §11.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../context/SupabaseContext';

const TEST_USER_PASSWORD = 'Pcptest1!';
const MAX_COUNT = 200;
const DEFAULT_COUNT = 10;
const DEFAULT_OPP_LEVEL = 20;

type BulkCreateResult = {
  job_id: string;
  created_count: number;
  errors: Array<{ n: number; email: string; error: string }>;
  emails_created: string[];
  start_n: number;
  end_n: number;
};

type BulkDeleteResult = {
  deleted_count: number;
  errors: Array<{ user_id: string; error: string }>;
};

type DeleteMode = 'job' | 'n_range' | 'all';

export function AdminTestUsersPage() {
  const { supabase } = useSupabase();
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [startN, setStartN] = useState<string>('');
  const [defaultOppLevel, setDefaultOppLevel] = useState(DEFAULT_OPP_LEVEL);
  const [jobNotes, setJobNotes] = useState('');
  const [confirmTestUsers, setConfirmTestUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const [deleteMode, setDeleteMode] = useState<DeleteMode>('job');
  const [deleteJobId, setDeleteJobId] = useState('');
  const [deleteStartN, setDeleteStartN] = useState('');
  const [deleteEndN, setDeleteEndN] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<BulkDeleteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const body: Record<string, unknown> = {
      count: Math.min(MAX_COUNT, Math.max(1, count)),
      default_opp_level: defaultOppLevel,
    };
    if (startN.trim() !== '') {
      const n = parseInt(startN.trim(), 10);
      if (!Number.isNaN(n) && n >= 0) body.start_n = n;
    }
    if (jobNotes.trim()) body.job_notes = jobNotes.trim();
    if (confirmTestUsers) body.confirm_test_users = true;

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('You must be signed in to create test users.');
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('bulk-create-test-users', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (fnError) {
        setError(fnError.message || 'Edge Function failed');
        return;
      }
      if (data?.error) {
        setError(typeof data.error === 'string' ? data.error : data.detail || JSON.stringify(data.error));
        return;
      }
      if (data?.job_id != null && typeof data.created_count === 'number') {
        setResult({
          job_id: data.job_id,
          created_count: data.created_count ?? 0,
          errors: Array.isArray(data.errors) ? data.errors : [],
          emails_created: Array.isArray(data.emails_created) ? data.emails_created : [],
          start_n: typeof data.start_n === 'number' ? data.start_n : 0,
          end_n: typeof data.end_n === 'number' ? data.end_n : 0,
        });
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setCreating(false);
    }
  };

  const copyEmails = () => {
    if (!result?.emails_created?.length) return;
    const text = result.emails_created.join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const downloadCsv = () => {
    if (!result?.emails_created?.length) return;
    const header = 'email\n';
    const rows = result.emails_created.join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-users-${result.start_n}-${result.end_n}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteResult(null);
    let body: Record<string, unknown> = {};
    if (deleteMode === 'all') {
      body.delete_all_test_users = true;
    } else if (deleteMode === 'job') {
      const id = deleteJobId.trim();
      if (!id) {
        setDeleteError('Enter a job ID.');
        return;
      }
      body.job_id = id;
    } else {
      const start = parseInt(deleteStartN.trim(), 10);
      const end = parseInt(deleteEndN.trim(), 10);
      if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
        setDeleteError('Enter valid start N and end N (start ≤ end).');
        return;
      }
      body.n_range = { start_n: start, end_n: end };
    }
    if (!confirmDelete) {
      setDeleteError('Check the confirmation box to proceed.');
      return;
    }
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDeleteError('You must be signed in to delete test users.');
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('bulk-delete-test-users', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (fnError) {
        setDeleteError(fnError.message || 'Edge Function failed');
        return;
      }
      if (data?.error) {
        setDeleteError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        return;
      }
      if (typeof data?.deleted_count === 'number') {
        setDeleteResult({
          deleted_count: data.deleted_count,
          errors: Array.isArray(data.errors) ? data.errors : [],
        });
      } else {
        setDeleteError('Unexpected response from server');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  const blockStyle = { marginBottom: '1rem' };
  const labelStyle = { display: 'block' as const, marginBottom: '0.25rem' };
  const inputStyle = { padding: '0.35rem', minWidth: '8rem' };

  return (
    <div>
      <h1>Test users</h1>
      <p style={{ marginBottom: '1rem', maxWidth: '36rem' }}>
        Create bulk test users with Gmail plus-aliases <code>proffyndev+oppN@gmail.com</code>. All use a fixed password (shown after create). Users are flagged as test and can be bulk-deleted later.
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '24rem' }}>
        <div style={blockStyle}>
          <label htmlFor="test-users-count" style={labelStyle}>Number to create (1–{MAX_COUNT})</label>
          <input
            id="test-users-count"
            type="number"
            min={1}
            max={MAX_COUNT}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10) || DEFAULT_COUNT)}
            disabled={creating}
            style={inputStyle}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="test-users-start-n" style={labelStyle}>Starting N (optional)</label>
          <input
            id="test-users-start-n"
            type="number"
            min={0}
            value={startN}
            onChange={(e) => setStartN(e.target.value)}
            placeholder="Leave blank to auto-allocate"
            disabled={creating}
            style={inputStyle}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="test-users-opp-level" style={labelStyle}>OPP level (default {DEFAULT_OPP_LEVEL})</label>
          <input
            id="test-users-opp-level"
            type="number"
            min={0}
            max={99}
            value={defaultOppLevel}
            onChange={(e) => setDefaultOppLevel(parseInt(e.target.value, 10) || DEFAULT_OPP_LEVEL)}
            disabled={creating}
            style={inputStyle}
          />
        </div>
        <div style={blockStyle}>
          <label htmlFor="test-users-notes" style={labelStyle}>Job notes (optional)</label>
          <input
            id="test-users-notes"
            type="text"
            value={jobNotes}
            onChange={(e) => setJobNotes(e.target.value)}
            disabled={creating}
            style={{ ...inputStyle, width: '100%', maxWidth: '20rem' }}
          />
        </div>
        <div style={blockStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmTestUsers}
              onChange={(e) => setConfirmTestUsers(e.target.checked)}
              disabled={creating}
            />
            I understand these are test users (required in production)
          </label>
        </div>
        {error && (
          <p role="alert" style={{ color: 'var(--color-error, #c00)', marginBottom: '0.5rem' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create test users'}
        </button>
        {' '}
        <Link to="/admin">Back to dashboard</Link>
      </form>

      {result && (
        <section style={{ marginTop: '2rem', maxWidth: '36rem' }} aria-label="Results">
          <h2>Result</h2>
          <p>
            Created <strong>{result.created_count}</strong> user(s), range N {result.start_n}–{result.end_n}.
            {result.errors.length > 0 && (
              <> <strong>{result.errors.length}</strong> error(s).</>
            )}
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Password for all:</strong> <code>{TEST_USER_PASSWORD}</code>
          </p>
          {result.emails_created.length > 0 && (
            <p style={blockStyle}>
              <button type="button" onClick={copyEmails}>
                {copyDone ? 'Copied' : 'Copy emails'}
              </button>
              {' '}
              <button type="button" onClick={downloadCsv}>Download CSV</button>
            </p>
          )}
          {result.emails_created.length > 0 && (
            <details style={blockStyle}>
              <summary>Emails created ({result.emails_created.length})</summary>
              <ul style={{ maxHeight: '12rem', overflow: 'auto', margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
                {result.emails_created.map((email) => (
                  <li key={email}><code>{email}</code></li>
                ))}
              </ul>
            </details>
          )}
          {result.errors.length > 0 && (
            <details style={blockStyle}>
              <summary>Per-user errors ({result.errors.length})</summary>
              <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', color: 'var(--color-error, #c00)' }}>
                {result.errors.map((err, i) => (
                  <li key={i}>N {err.n} {err.email}: {err.error}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section style={{ marginTop: '2.5rem', maxWidth: '36rem' }} aria-label="Bulk delete">
        <h2>Bulk delete test users</h2>
        <p style={{ marginBottom: '1rem' }}>
          Delete test users by job, by N range, or all. Removes player rows (and dependent data) then Auth users.
        </p>
        <form onSubmit={handleDelete} style={{ maxWidth: '24rem' }}>
          <div style={blockStyle}>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={labelStyle}>Delete</legend>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.25rem' }}>
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteMode === 'job'}
                  onChange={() => setDeleteMode('job')}
                  disabled={deleting}
                />
                By job ID
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.25rem' }}>
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteMode === 'n_range'}
                  onChange={() => setDeleteMode('n_range')}
                  disabled={deleting}
                />
                By N range
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="delete-mode"
                  checked={deleteMode === 'all'}
                  onChange={() => setDeleteMode('all')}
                  disabled={deleting}
                />
                All test users
              </label>
            </fieldset>
          </div>
          {deleteMode === 'job' && (
            <div style={blockStyle}>
              <label htmlFor="delete-job-id" style={labelStyle}>Job ID</label>
              <input
                id="delete-job-id"
                type="text"
                value={deleteJobId}
                onChange={(e) => setDeleteJobId(e.target.value)}
                placeholder="e.g. from create result"
                disabled={deleting}
                style={{ ...inputStyle, width: '100%', maxWidth: '20rem' }}
              />
            </div>
          )}
          {deleteMode === 'n_range' && (
            <div style={blockStyle}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label htmlFor="delete-start-n" style={labelStyle}>Start N</label>
                <input
                  id="delete-start-n"
                  type="number"
                  min={0}
                  value={deleteStartN}
                  onChange={(e) => setDeleteStartN(e.target.value)}
                  disabled={deleting}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="delete-end-n" style={labelStyle}>End N</label>
                <input
                  id="delete-end-n"
                  type="number"
                  min={0}
                  value={deleteEndN}
                  onChange={(e) => setDeleteEndN(e.target.value)}
                  disabled={deleting}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
          <div style={blockStyle}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                disabled={deleting}
              />
              I confirm I want to delete these test users
            </label>
          </div>
          {deleteError && (
            <p role="alert" style={{ color: 'var(--color-error, #c00)', marginBottom: '0.5rem' }}>
              {deleteError}
            </p>
          )}
          <button type="submit" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete test users'}
          </button>
        </form>
        {deleteResult && (
          <div style={{ marginTop: '1rem' }}>
            <p>
              Deleted <strong>{deleteResult.deleted_count}</strong> user(s).
              {deleteResult.errors.length > 0 && (
                <> <strong>{deleteResult.errors.length}</strong> error(s).</>
              )}
            </p>
            {deleteResult.errors.length > 0 && (
              <details style={blockStyle}>
                <summary>Errors ({deleteResult.errors.length})</summary>
                <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', color: 'var(--color-error, #c00)' }}>
                  {deleteResult.errors.map((err, i) => (
                    <li key={i}>{err.user_id}: {err.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
