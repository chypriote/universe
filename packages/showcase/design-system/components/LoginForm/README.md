# LoginForm

The Owner login form inside the LoginAction Popup: one password Field and a `success` Button "Log in". It posts to the app's `/login` action. Showcase `LoginForm.svelte`.

`onSuccess` runs after the page data reloads; LoginAction closes the Popup there. While the request runs the Button shows loading. A wrong password shows the Field error "Wrong password" and keeps the password. On success the password clears.
