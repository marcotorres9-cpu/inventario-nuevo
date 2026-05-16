package com.inventariopro.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "InventarioPro";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // CRITICAL: Clear WebView cache so it always loads fresh code from server
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearCache(true);
                webView.clearHistory();
                // Clear cookies too
                CookieManager.getInstance().removeAllCookies(null);
                CookieManager.getInstance().flush();
                // Disable caching at the WebView settings level
                WebSettings settings = webView.getSettings();
                settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
                Log.d(TAG, "WebView cache cleared, LOAD_NO_CACHE set");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear WebView cache: " + e.getMessage());
        }

        // Register native bridge for WebView JS calls
        try {
            getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "NativeBridge");
            Log.d(TAG, "NativeBridge registered OK");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register NativeBridge: " + e.getMessage());
            // Fallback: try registering after a delay (Capacitor bridge might not be ready)
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "NativeBridge");
                        Log.d(TAG, "NativeBridge registered OK (delayed)");
                    } catch (Exception e2) {
                        Log.e(TAG, "Failed to register NativeBridge (delayed): " + e2.getMessage());
                    }
                }
            }, 2000);
        }
    }

    /**
     * Native bridge accessible from JavaScript via window.NativeBridge.method()
     */
    public class NativeBridge {

        /**
         * Open a URL in Chrome (or default browser) outside the WebView.
         * From JS: window.NativeBridge.openInBrowser("https://...")
         */
        @JavascriptInterface
        public void openInBrowser(final String url) {
            Log.d(TAG, "openInBrowser: " + url);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Uri uri = Uri.parse(url);
                        // Always use chooser to guarantee a picker appears
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                        // Force the chooser even if there's a default browser
                        Intent chooser = Intent.createChooser(intent, "Abrir con...");
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(chooser);
                    } catch (Exception e) {
                        Log.e(TAG, "openInBrowser error: " + e.getMessage());
                        // Fallback: try Chrome directly
                        try {
                            Intent chromeIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            chromeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            chromeIntent.setPackage("com.android.chrome");
                            startActivity(chromeIntent);
                        } catch (Exception e2) {
                            // Fallback 2: try any browser
                            try {
                                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com"));
                                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                if (browserIntent.resolveActivity(getPackageManager()) != null) {
                                    // A browser exists, re-try with the original URL
                                    Intent retryIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                    retryIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(retryIntent);
                                } else {
                                    Toast.makeText(MainActivity.this, "No hay navegador instalado", Toast.LENGTH_LONG).show();
                                }
                            } catch (Exception e3) {
                                Toast.makeText(MainActivity.this, "No se puede abrir navegador", Toast.LENGTH_LONG).show();
                            }
                        }
                    }
                }
            });
        }

        /**
         * Download a file using Android DownloadManager and then open it.
         * First downloads to Downloads folder, then opens with appropriate app.
         * From JS: window.NativeBridge.downloadAndOpen("https://...", "filename.pdf")
         */
        @JavascriptInterface
        public void downloadAndOpen(final String url, final String fileName) {
            Log.d(TAG, "downloadAndOpen: " + url + " -> " + fileName);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        // Sanitize fileName - remove any path separators or special chars
                        String safeName = fileName.replaceAll("[^a-zA-Z0-9\\.\\-_ ]", "_");

                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setTitle(safeName);
                        request.setDescription("Descargando " + safeName);
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeName);
                        request.setAllowedOverMetered(true);
                        request.setAllowedOverRoaming(true);
                        // Don't use weird MIME types - let the system detect from URL
                        request.setMimeType("*/*");

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        long downloadId = dm.enqueue(request);

                        Toast.makeText(MainActivity.this, "Descargando: " + safeName, Toast.LENGTH_LONG).show();

                        // Monitor download and open when done
                        new Thread(new Runnable() {
                            @Override
                            public void run() {
                                boolean downloading = true;
                                int attempts = 0;
                                while (downloading && attempts < 120) {
                                    attempts++;
                                    try {
                                        Thread.sleep(1000);
                                    } catch (InterruptedException ie) { break; }
                                    DownloadManager.Query q = new DownloadManager.Query();
                                    q.setFilterById(downloadId);
                                    android.database.Cursor cursor = dm.query(q);
                                    if (cursor.moveToFirst()) {
                                        int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                                        int status = cursor.getInt(statusIndex);
                                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                            downloading = false;
                                            final File file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), safeName);
                                            Log.d(TAG, "Download complete: " + file.getAbsolutePath() + " exists=" + file.exists() + " size=" + file.length());

                                            new Handler(Looper.getMainLooper()).post(new Runnable() {
                                                @Override
                                                public void run() {
                                                    try {
                                                        if (file.exists()) {
                                                            Uri fileUri;
                                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                                                fileUri = FileProvider.getUriForFile(MainActivity.this,
                                                                        getApplicationContext().getPackageName() + ".fileprovider", file);
                                                            } else {
                                                                fileUri = Uri.fromFile(file);
                                                            }
                                                            Intent openIntent = new Intent(Intent.ACTION_VIEW);
                                                            String mimeType = getMimeType(safeName);
                                                            openIntent.setDataAndType(fileUri, mimeType);
                                                            openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                                            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                                            startActivity(openIntent);
                                                        } else {
                                                            // File doesn't exist, open in browser instead
                                                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                                            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                                            startActivity(browserIntent);
                                                        }
                                                    } catch (Exception ex) {
                                                        Log.e(TAG, "Open error: " + ex.getMessage());
                                                        // Fallback: open URL in browser
                                                        try {
                                                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                                            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                                            startActivity(browserIntent);
                                                        } catch (Exception ex2) {
                                                            Toast.makeText(MainActivity.this, "No se pudo abrir el archivo", Toast.LENGTH_SHORT).show();
                                                        }
                                                    }
                                                }
                                            });
                                        } else if (status == DownloadManager.STATUS_FAILED) {
                                            downloading = false;
                                            int reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);
                                            int reason = reasonIndex >= 0 ? cursor.getInt(reasonIndex) : -1;
                                            final String errorReason;
                                            switch (reason) {
                                                case DownloadManager.ERROR_CANNOT_RESUME: errorReason = "No se puede resumir"; break;
                                                case DownloadManager.ERROR_DEVICE_NOT_FOUND: errorReason = "Dispositivo no encontrado"; break;
                                                case DownloadManager.ERROR_FILE_ALREADY_EXISTS: errorReason = "Archivo ya existe"; break;
                                                case DownloadManager.ERROR_FILE_ERROR: errorReason = "Error de archivo"; break;
                                                case DownloadManager.ERROR_HTTP_DATA_ERROR: errorReason = "Error de datos HTTP"; break;
                                                case DownloadManager.ERROR_INSUFFICIENT_SPACE: errorReason = "Espacio insuficiente"; break;
                                                case DownloadManager.ERROR_TOO_MANY_REDIRECTS: errorReason = "Muchas redirecciones"; break;
                                                case DownloadManager.ERROR_UNHANDLED_HTTP_CODE: errorReason = "Error HTTP"; break;
                                                default: errorReason = "Error desconocido (" + reason + ")"; break;
                                            }
                                            Log.e(TAG, "Download failed: " + errorReason);
                                            final String msg = "Error al descargar: " + errorReason;
                                            new Handler(Looper.getMainLooper()).post(new Runnable() {
                                                @Override
                                                public void run() {
                                                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
                                                }
                                            });
                                        }
                                    }
                                    cursor.close();
                                }
                            }
                        }).start();

                    } catch (Exception e) {
                        Log.e(TAG, "downloadAndOpen error: " + e.getMessage());
                        // Fallback: open URL directly in browser
                        try {
                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(browserIntent);
                        } catch (Exception e2) {
                            Toast.makeText(MainActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    }
                }
            });
        }

        /**
         * Share a URL via Android's native share sheet.
         * From JS: window.NativeBridge.shareUrl("https://...", "titulo", "texto")
         */
        @JavascriptInterface
        public void shareUrl(final String url, final String title, final String text) {
            Log.d(TAG, "shareUrl: " + url);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("text/plain");
                        shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                        shareIntent.putExtra(Intent.EXTRA_TEXT, text + "\n" + url);
                        Intent chooser = Intent.createChooser(shareIntent, title);
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(chooser);
                    } catch (Exception e) {
                        Log.e(TAG, "shareUrl error: " + e.getMessage());
                        Toast.makeText(MainActivity.this, "Error al compartir", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        /**
         * Download file only (don't open).
         * From JS: window.NativeBridge.downloadFile("https://...", "filename.pdf")
         */
        @JavascriptInterface
        public void downloadFile(final String url, final String fileName) {
            Log.d(TAG, "downloadFile: " + url + " -> " + fileName);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setTitle(fileName);
                        request.setDescription("Descargando " + fileName);
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                        request.setAllowedOverMetered(true);
                        request.setAllowedOverRoaming(true);

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        dm.enqueue(request);

                        Toast.makeText(MainActivity.this, "Descargando: " + fileName, Toast.LENGTH_LONG).show();
                    } catch (Exception e) {
                        Log.e(TAG, "downloadFile error: " + e.getMessage());
                        Toast.makeText(MainActivity.this, "Error al descargar", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        /**
         * Clear all WebView cache and reload.
         * From JS: window.NativeBridge.clearCacheAndReload()
         */
        @JavascriptInterface
        public void clearCacheAndReload() {
            Log.d(TAG, "clearCacheAndReload called");
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            webView.clearCache(true);
                            webView.clearHistory();
                            CookieManager.getInstance().removeAllCookies(null);
                            CookieManager.getInstance().flush();
                            WebSettings settings = webView.getSettings();
                            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
                            Log.d(TAG, "Cache cleared from JS bridge");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "clearCacheAndReload error: " + e.getMessage());
                    }
                }
            });
        }

        private String getMimeType(String fileName) {
            if (fileName == null) return "*/*";
            String name = fileName.toLowerCase();
            if (name.endsWith(".pdf")) return "application/pdf";
            if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
            if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "application/vnd.ms-excel";
            if (name.endsWith(".csv")) return "text/csv";
            if (name.endsWith(".png")) return "image/png";
            if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
            return "*/*";
        }
    }
}
