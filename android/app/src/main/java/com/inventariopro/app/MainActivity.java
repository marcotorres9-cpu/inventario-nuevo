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
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
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
     * This bypasses ALL WebView limitations for file operations.
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
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        // Ensure it opens in a real browser, not in-app
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                        } else {
                            Toast.makeText(MainActivity.this, "No hay navegador disponible", Toast.LENGTH_SHORT).show();
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "openInBrowser error: " + e.getMessage());
                        Toast.makeText(MainActivity.this, "Error al abrir navegador", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        /**
         * Download a file using Android DownloadManager.
         * Shows progress in notification bar. File is saved to Downloads folder.
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

                        // Allow download over both metered and unmetered connections
                        request.setAllowedOverMetered(true);
                        request.setAllowedOverRoaming(true);

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        dm.enqueue(request);

                        Toast.makeText(MainActivity.this, "Descargando: " + fileName, Toast.LENGTH_LONG).show();
                    } catch (Exception e) {
                        Log.e(TAG, "downloadFile error: " + e.getMessage());
                        Toast.makeText(MainActivity.this, "Error al descargar: " + e.getMessage(), Toast.LENGTH_SHORT).show();
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
                        // First download the file
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setTitle(fileName);
                        request.setDescription("Descargando " + fileName);
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                        request.setAllowedOverMetered(true);
                        request.setAllowedOverRoaming(true);

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        long downloadId = dm.enqueue(request);

                        Toast.makeText(MainActivity.this, "Descargando: " + fileName, Toast.LENGTH_LONG).show();

                        // Monitor download completion and open the file
                        new Thread(new Runnable() {
                            @Override
                            public void run() {
                                boolean downloading = true;
                                while (downloading) {
                                    DownloadManager.Query q = new DownloadManager.Query();
                                    q.setFilterById(downloadId);
                                    android.database.Cursor cursor = dm.query(q);
                                    if (cursor.moveToFirst()) {
                                        int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                                        int status = cursor.getInt(statusIndex);
                                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                            downloading = false;
                                            // File downloaded, open it
                                            File file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName);
                                            if (file.exists()) {
                                                Uri fileUri;
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                                    fileUri = FileProvider.getUriForFile(MainActivity.this,
                                                            getApplicationContext().getPackageName() + ".fileprovider", file);
                                                } else {
                                                    fileUri = Uri.fromFile(file);
                                                }
                                                Intent openIntent = new Intent(Intent.ACTION_VIEW);
                                                String mimeType = getMimeType(fileName);
                                                openIntent.setDataAndType(fileUri, mimeType);
                                                openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                                openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                                startActivity(openIntent);
                                            }
                                        } else if (status == DownloadManager.STATUS_FAILED) {
                                            downloading = false;
                                        }
                                    }
                                    cursor.close();
                                    if (downloading) {
                                        try { Thread.sleep(500); } catch (InterruptedException ie) {}
                                    }
                                }
                            }
                        }).start();

                    } catch (Exception e) {
                        Log.e(TAG, "downloadAndOpen error: " + e.getMessage());
                        Toast.makeText(MainActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
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
