const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;
      if (isLocalhost) {
        checkValidServiceWorker(swUrl);
      } else {
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker.register(swUrl).then(registration => {
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('Ny version tillgänglig – ladda om för att uppdatera.');
        }
      };
    };
  }).catch(error => {
    console.error('Service worker-registrering misslyckades:', error);
  });
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } }).then(response => {
    const contentType = response.headers.get('content-type');
    if (response.status === 404 || (contentType && !contentType.includes('javascript'))) {
      navigator.serviceWorker.ready.then(r => r.unregister()).then(() => window.location.reload());
    } else {
      registerValidSW(swUrl);
    }
  }).catch(() => {
    console.log('Ingen internetanslutning – appen körs i offline-läge.');
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(r => r.unregister());
  }
}
