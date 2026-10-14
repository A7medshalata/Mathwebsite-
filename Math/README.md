# MathHub

A math learning website: books, tests, homework skills, mistakes, weak lessons, a Friday checkpoint, and a teacher dashboard.

## Run it

1. Install Node.js 18 or newer from https://nodejs.org
2. In this folder, run:

```
npm install
npm start
```

3. Open http://localhost:3000

## Accounts

- **Teacher** (created on first run): username `teacher`, password `teacher123`. Change it from the dashboard right away.
- **Students** register on the Register page. They cannot log in until the teacher activates them in the dashboard.

## Pages

| Page | What it does |
| --- | --- |
| index.html | Log in |
| register.html | Student sign-up |
| books.html | Pick one or more books |
| tests.html | Test built from the books you picked |
| skills.html | Lessons and practice questions (homework skills) |
| mistakes.html | Every question you last got wrong, with a retry quiz |
| weak.html | Lessons where you answered 2+ questions and scored under 60% |
| checkpoint.html | Friday test built from your weak lessons (once per week) |
| teacher.html | Activate accounts, see accuracy per student and per lesson, reset passwords |

## Add your own content

Edit `seed.js` (books, lessons, questions), delete `mathhub.db`, and start the server again. Each question has 4 options and the index of the correct one.

## Settings (environment variables)

- `PORT`: default 3000
- `TZ_NAME`: time zone used to decide when it is Friday, default `Africa/Cairo`
- `CHECKPOINT_ANY_DAY=1`: lets you test the checkpoint on any day
- `JWT_SECRET`: set your own secret in production

## Before putting it online

Use HTTPS, change the teacher password, set `JWT_SECRET`, and back up `mathhub.db` regularly.
