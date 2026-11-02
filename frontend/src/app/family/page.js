'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import FieldLabel from '@/components/FieldLabel';
import PatientShell from '@/components/patient/PatientShell';
import { authApi, familyApi } from '@/lib/api';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
const RELATIONS = [
  ['spouse', 'Spouse'],
  ['child', 'Child'],
  ['parent', 'Parent'],
  ['sibling', 'Sibling'],
  ['other', 'Other'],
];
const EMPTY = { fullName: '', relation: 'child', gender: 'other', age: '', phone: '', bloodGroup: '' };

export default function FamilyCarePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role !== 'patient') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    familyApi
      .list()
      .then((data) => setMembers(data.members))
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [user]);

  function startEdit(m) {
    setEditingId(m.id);
    setForm({ fullName: m.fullName, relation: m.relation, gender: m.gender, age: m.age ?? '', phone: m.phone, bloodGroup: m.bloodGroup });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId('');
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) {
      setError('Please enter the family member\'s name');
      return;
    }
    const payload = { ...form, age: form.age === '' ? undefined : Number(form.age) };
    setSaving(true);
    try {
      if (editingId) {
        const res = await familyApi.update(editingId, payload);
        setMembers((list) => list.map((m) => (m.id === editingId ? res.member : m)));
      } else {
        const res = await familyApi.create(payload);
        setMembers((list) => [...list, res.member]);
      }
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Remove this family member?')) return;
    try {
      await familyApi.remove(id);
      setMembers((list) => list.filter((m) => m.id !== id));
      if (editingId === id) reset();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return <PageSkeleton />;
  }

  return (
    <PatientShell user={user}>
      <h1 className="text-2xl font-bold text-ss-text">Family care</h1>
      <p className="mt-1 text-sm text-ss-muted">
        Add people you look after. When you book a serial you can choose who the appointment is for.
      </p>
      <div className="mt-4">
        <Alert message={error} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Family members">
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id} className="ss-card flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ss-primary/15 text-sm font-bold text-ss-primary">
                    {m.fullName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ss-text">{m.fullName}</p>
                    <p className="text-xs capitalize text-ss-muted">
                      {m.relation}
                      {m.age !== null ? ` · ${m.age} yrs` : ''}
                      {m.bloodGroup ? ` · ${m.bloodGroup}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(m)} className="ss-btn-secondary px-3 py-1.5 text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(m.id)} className="ss-btn-danger-outline px-3 py-1.5 text-xs">
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {!loaded ? (
              <li>
                <ListSkeleton rows={2} lines={1} action={false} label="Loading family members" />
              </li>
            ) : null}
            {loaded && !members.length ? (
              <li className="ss-card p-6 text-center text-sm text-ss-muted">
                No family members yet. Add a parent, child or spouse to book for them.
              </li>
            ) : null}
          </ul>
        </section>

        <form onSubmit={submit} className="ss-card h-fit space-y-4 p-5" aria-label={editingId ? 'Edit family member' : 'Add family member'}>
          <h2 className="font-semibold text-ss-text">{editingId ? 'Edit member' : 'Add a member'}</h2>
          <p className="text-xs text-ss-muted">
            Fields marked <span className="text-ss-tertiary">*</span> are required.
          </p>
          <label className="block text-sm text-ss-muted">
            <FieldLabel required className="">Full name</FieldLabel>
            <input className="ss-input mt-1" required value={form.fullName} maxLength={120} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-ss-muted">
              <FieldLabel required className="">Relation</FieldLabel>
              <select className="ss-input mt-1" required value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
                {RELATIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-ss-muted">
              Gender
              <select className="ss-input mt-1" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm text-ss-muted">
              Age
              <input className="ss-input mt-1" type="number" min="0" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </label>
            <label className="block text-sm text-ss-muted">
              Blood group
              <input className="ss-input mt-1" value={form.bloodGroup} maxLength={4} placeholder="O+" onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
            </label>
          </div>
          <label className="block text-sm text-ss-muted">
            Phone (optional)
            <input className="ss-input mt-1" value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="ss-btn-primary flex-1">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add member'}
            </button>
            {editingId ? (
              <button type="button" onClick={reset} className="ss-btn-secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </PatientShell>
  );
}
