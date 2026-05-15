// capacitor-bundle.js - NV31
// REGISTRO DE PLUGINS PARA BRIDGE NATIVO
// NO crea window.Capacitor - espera la inyeccion nativa de Android
// Cuando el bridge nativo esta listo, registra Filesystem y Share

(function() {
    var _registered = false;

    function registerPlugins() {
        if (_registered || !window.Capacitor) return;
        _registered = true;

        try {
            // Registrar Filesystem SIN implementacion web
            // El bridge nativo de Android maneja las llamadas
            var fs = Capacitor.registerPlugin('Filesystem');
            Capacitor.Plugins.Filesystem = fs;
            console.log('[Capacitor] Filesystem registrado (nativo)');

            // Registrar Share SIN implementacion web
            var share = Capacitor.registerPlugin('Share');
            Capacitor.Plugins.Share = share;
            console.log('[Capacitor] Share registrado (nativo)');
        } catch(e) {
            console.error('[Capacitor] Error registrando plugins:', e);
        }
    }

    // Verificar inmediatamente (por si el bridge ya se inyecto)
    if (window.Capacitor) {
        registerPlugins();
    }

    // Sondeo cada 50ms esperando la inyeccion nativa (onPageFinished)
    var _poll = setInterval(function() {
        if (window.Capacitor) {
            registerPlugins();
            clearInterval(_poll);
        }
    }, 50);

    // Detener sondeo despues de 5 segundos
    setTimeout(function() {
        clearInterval(_poll);
        if (!_registered) {
            console.log('[Capacitor] Bridge nativo no detectado - modo navegador');
        }
    }, 5000);
})();
