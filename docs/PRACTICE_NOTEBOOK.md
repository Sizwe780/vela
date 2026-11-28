# Private practice notebook

Open **Math practice** from learning navigation and expand **My practice notebook** in the scratchpad. The same notebook is available inside supported lesson exercises. The previous notebook URL opens Math Practice with the notebook expanded.

1. Work through an example with the local checker.
2. Give the attempt a title and add a reflection. Choose **Practice** or **Mistake to revisit**.
3. Select **Save copy to notebook**. This is an explicit private database save, not automatic recording.
4. Reopen a copy, confirm replacement of the current scratchpad, and let the local checker re-evaluate its saved lines. **Stop checking** cancels a long replay.

Saved entries contain the starting expression, attempted lines, declared row operations, checker settings, unsent mathematical draft, exercise context, separate working notes and reflection. They do not contain generated answer keys, asserted verification results or grades. The server rejects score/feedback/identity injection. Reopening runs new checks and carries domain conditions forward; unsupported notation remains unverified. No mastery, completion, email or AI call is triggered by notebook actions.

Copies are immutable: reopen, edit and save a new copy to retain a revision. **Export text** downloads a saved copy; **Export current draft** works without a successful server save. Deletion requires a separate confirmation. Filtering and pagination keep the list manageable. At most 100 copies per account and 20 lines per copy are supported; entries must stay below 64 KB. Export/delete older work when full.

Private saved copies remain personal work rather than module access grants. Withdrawing from a module does not delete your own writing or unlock its source materials. The notebook is account-scoped, independent of module codes and qualifications. Two-account API tests cover isolation and retry safety. A changed account cannot save a previously bound editor's work until the page is reloaded.

## API

- `GET /api/practice-notebook?page=0&kind=mistake`: own entries only, 20 per page, plus `hasMore` and the authenticated owner ID. Omit `kind` to include all entries.
- `POST /api/practice-notebook`: strict `{id,ownerId,title,reflection,kind,snapshot}` payload. `id` is a UUID retained when retrying an ambiguous save. Reusing it for the same data returns the existing copy; different data conflicts. A learner-scoped transaction lock enforces the 100-entry cap.
- `DELETE /api/practice-notebook?id=UUID`: deletes only an owned entry. Foreign/missing entries return 404.

All handlers require authentication. Mutations enforce same-origin checks. Responses are private and uncached. Data is stored in the additive `PracticeNotebook` table; no content ingestion tables are modified.

Migration: `20261118130000_practice_notebook`. On this Windows environment the native Prisma migration engine failed; the existing transactional migration runner applied the reviewed SQL and recorded its checksum in Prisma migration history:

```powershell
node scripts/apply-enrollment-migration.mjs --migration=20261118130000_practice_notebook
```

This is online saved work, not an offline synchronization system. Drafts remain in memory until explicitly saved/exported. Production retention and operator-managed account deletion must include this table alongside existing notes and progress records.


## Expressive scratchpad revision
Optional `snapshot.notes` stores up to 4,000 characters of ungraded substitution/method notes and is included in text exports. Older snapshots without notes remain valid. Row-operation snapshots additionally accept `equivalence` for an explicit overall exact RREF comparison and row indices up to 6; rational matrices are bounded to 6×7. Algebra replay advances only after accepted lines and carries all earlier domain restrictions forward. Derivative mode checks the initial derivative once, then checks equivalent rewrites; antiderivative mode stays anchored to the original integrand. Notes and check results never award mastery. The core worker remains local, cancellable and time-bounded.
