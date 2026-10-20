// Keep the browser's URL and Origin intact for same-origin checks and session cookies.
// The service binding reaches the existing app, database and private storage internally.
export default {
  fetch(request, env) {
    return env.STASHBOX.fetch(request);
  },
};
