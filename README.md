# Halloween Party Safe / Not Safe App

A very simple static web app for a Halloween party game.

## How it works

- Players enter their name on the main page.
- The app stores their status in the browser using `localStorage`.
- The admin logs in separately and can set each player to:
  - Safe
  - Not Safe
  - Waiting
- The player's screen then changes colour automatically:
  - Green = Safe
  - Red = Not Safe
  - Orange = Waiting

## Admin login

- Username: `admin`
- Password: `halloween`

## GitHub Pages setup

1. Push this folder to a GitHub repository.
2. In GitHub, open the repository.
3. Go to `Settings` → `Pages`.
4. Under `Build and deployment`, set:
   - Source: `Deploy from a branch`
   - Branch: `main` / `master`
   - Folder: `/ (root)`
5. Save.
6. GitHub will give you a live Pages URL.

## Notes

This app is intentionally simple and works well for a party because it does not require a backend or database. Everything is stored in the browser, so it is best for small local games and demos.
