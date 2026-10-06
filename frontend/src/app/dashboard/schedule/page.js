'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import FormField from '@/components/FormField';
import { authApi, scheduleApi } from '@/lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyForm = {
  chamberId: '',
  daysOfWeek: [],
  startTime: '09:00',
  endTime: '12:00',
  consultationFee: '',
  patientsPerSlot: 1,
  slotDurationMinutes: 15,
};

export default function DoctorSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chambers, setChambers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [chamberForm, setChamberForm] = useState({ name: '', address: '', city: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [ch, sc] = await Promise.all([scheduleApi.listChambers(), scheduleApi.listMySchedules()]);
    setChambers(ch.chambers);
    setSchedules(sc.schedules);
    if (ch.chambers.length && !form.chamberId) {
      setForm((f) => ({ ...f, chamberId: ch.chambers[0].id }));
    }
  }, [form.chamberId]);

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        if (data.user.role !== 'doctor' && data.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(data.user);
        return load();
      })
      .catch(() => router.replace('/login'));
  }, [router, load]);

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  function toggleDay(day) {
    setForm((f) => {
      const set = new Set(f.daysOfWeek);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...f, daysOfWeek: [...set].sort((a, b) => a - b) };
    });
  }

  async function handleCreateChamber(e) {
    e.preventDefault();
    setError('');
    try {
      await scheduleApi.createChamber(chamberForm);
      setChamberForm({ name: '', address: '', city: '' });
      setMessage('Chamber added');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateSchedule(e) {
    e.preventDefault();
    setError('');
    try {
      await scheduleApi.createSchedule({
        ...form,
        consultationFee: Number(form.consultationFee),
        patientsPerSlot: Number(form.patientsPerSlot),
        slotDurationMinutes: Number(form.slotDurationMinutes),
      });
      setMessage('Availability saved');
      setForm((f) => ({ ...emptyForm, chamberId: f.chamberId }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this availability block?')) return;
    setError('');
    try {
      await scheduleApi.deleteSchedule(id);
      setMessage('Availability removed');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleStatus(schedule) {
    setError('');
    const next = schedule.status === 'active' ? 'inactive' : 'active';
    try {
      await scheduleApi.setScheduleStatus(schedule.id, next);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader active="schedule" onLogout={handleLogout} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">My schedule</h1>
        <p className="mt-1 text-sm text-slate-600">Chambers and when you see patients each week.</p>
        <Alert message={error} />
        {message ? <p className="mt-4 text-sm text-teal-700">{message}</p> : null}

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Add chamber</h2>
          <form onSubmit={handleCreateChamber} className="mt-4 grid gap-4 sm:grid-cols-3">
            <FormField label="Name" value={chamberForm.name} onChange={(e) => setChamberForm({ ...chamberForm, name: e.target.value })} required />
            <FormField label="Address" value={chamberForm.address} onChange={(e) => setChamberForm({ ...chamberForm, address: e.target.value })} />
            <FormField label="City" value={chamberForm.city} onChange={(e) => setChamberForm({ ...chamberForm, city: e.target.value })} />
            <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 sm:col-span-3 sm:w-fit">
              Save chamber
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">New availability</h2>
          <form onSubmit={handleCreateSchedule} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Chamber
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.chamberId}
                onChange={(e) => setForm({ ...form, chamberId: e.target.value })}
                required
              >
                <option value="">Select chamber</option>
                {chambers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="text-sm font-medium text-slate-700">Days</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      form.daysOfWeek.includes(i) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <FormField label="End" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              <FormField label="Fee (BDT)" type="number" min="0" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} required />
              <FormField label="Patients per slot" type="number" min="1" value={form.patientsPerSlot} onChange={(e) => setForm({ ...form, patientsPerSlot: e.target.value })} />
            </div>
            <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Create availability
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="font-semibold text-slate-900">Your schedules</h2>
          <ul className="mt-4 space-y-3">
            {schedules.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{s.chamber?.name || 'Chamber'}</p>
                  <p className="text-sm text-slate-600">
                    {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')} · {s.startTime}–{s.endTime} · ৳{s.consultationFee}
                  </p>
                  <p className="text-xs capitalize text-slate-500">Status: {s.status}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleToggleStatus(s)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                    {s.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" onClick={() => handleDelete(s.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700">
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {!schedules.length ? <li className="text-sm text-slate-500">No schedules yet.</li> : null}
          </ul>
        </section>
      </main>
    </div>
  );
}
