# CLAUDE.md

Permissions live in `App.Core/Authorization/`. Follow the loadout `auth` skill; never check a role outside that folder.

- Database access lives only in `App.Data/` and `App.Api/Auth/`. Every `.Notes` read in `App.Data/Repositories/` applies the filter it was passed, and `NoteService` builds that filter from `NotePolicy.Filter`. `GuardTests` fails on anything else.
- Claude never reads `.dev-mail/` or `keys/`: the files hold sign-in links and signing keys.
