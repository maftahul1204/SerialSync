# Manual QA — doctor schedules

Run API on port 5000 and frontend on 3000 with Mongo up.

## Doctor

1. Log in as a doctor account.
2. Dashboard → Schedule.
3. Add a chamber (any name/city is fine).
4. Add availability — pick a few weekdays, set times and fee.
5. Check it shows under your schedule list.
6. Deactivate it and open `/doctors/<your-user-id>/schedule` in another tab — block should disappear.
7. Delete a block and make sure the list updates.

## Overlap

1. Save Mon 9:00–11:00.
2. Try Mon 10:00–12:00 on the same account — API should reject it.

## Public page

1. Visit `/doctors/<doctorId>/schedule`.
2. Choose a date on a day you configured — slots should show if anything is active.

## Tests

```bash
cd backend && npm test
```
