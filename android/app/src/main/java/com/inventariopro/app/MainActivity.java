package com.inventariopro.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.HttpURLConnection;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NativeBridge";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "NativeBridge");
    }

    public class NativeBridge {

        @JavascriptInterface
        public void openInBrowser(String url) {
            Log.d(TAG, "openInBrowser: " + (url != null && url.length() > 100 ? url.substring(0, 100) + "..." : url));
            if (url == null || url.isEmpty()) return;
            // If it's a data URI, handle it differently
            if (url.startsWith("data:")) {
                openDataImage(url);
                return;
            }
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "openInBrowser error", e);
            }
        }

        @JavascriptInterface
        public void openDataImage(String dataUri) {
            Log.d(TAG, "openDataImage called, length=" + (dataUri != null ? dataUri.length() : 0));
            try {
                // Parse data URI: "data:image/png;base64,XXXXX..."
                String base64Data;
                String mimeType = "image/png";

                if (dataUri.startsWith("data:")) {
                    int commaIdx = dataUri.indexOf(',');
                    if (commaIdx > 0) {
                        String header = dataUri.substring(0, commaIdx);
                        base64Data = dataUri.substring(commaIdx + 1);

                        // Extract mime type from header
                        if (header.contains("image/jpeg") || header.contains("image/jpg")) {
                            mimeType = "image/jpeg";
                        } else if (header.contains("image/png")) {
                            mimeType = "image/png";
                        } else if (header.contains("image/webp")) {
                            mimeType = "image/webp";
                        } else if (header.contains("image/gif")) {
                            mimeType = "image/gif";
                        }
                    } else {
                        base64Data = dataUri.substring(5);
                    }
                } else {
                    base64Data = dataUri;
                }

                // Decode base64
                byte[] imageData = Base64.decode(base64Data, Base64.DEFAULT);

                // Determine extension
                String extension = ".jpg";
                if (mimeType.contains("png")) extension = ".png";
                else if (mimeType.contains("webp")) extension = ".webp";
                else if (mimeType.contains("gif")) extension = ".gif";

                // Save to cache directory
                File cacheDir = getCacheDir();
                String fileName = "catalogo_" + System.currentTimeMillis() + extension;
                File imageFile = new File(cacheDir, fileName);
                FileOutputStream fos = new FileOutputStream(imageFile);
                fos.write(imageData);
                fos.flush();
                fos.close();

                Log.d(TAG, "Image saved to: " + imageFile.getAbsolutePath() + " size=" + imageData.length);

                // Open with image viewer
                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri fileUri = Uri.fromFile(imageFile);

                // On Android 7+, use FileProvider for shared access
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    try {
                        Uri contentUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            "com.inventariopro.app.fileprovider",
                            imageFile
                        );
                        intent.setDataAndType(contentUri, mimeType);
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (Exception e) {
                        // Fallback without FileProvider
                        intent.setDataAndType(fileUri, mimeType);
                    }
                } else {
                    intent.setDataAndType(fileUri, mimeType);
                }

                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);

            } catch (Exception e) {
                Log.e(TAG, "openDataImage error", e);
                // Fallback: save to Downloads and let user open manually
                try {
                    byte[] imageData = Base64.decode(
                        dataUri.contains(",") ? dataUri.substring(dataUri.indexOf(',') + 1) : dataUri.substring(5),
                        Base64.DEFAULT
                    );
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    String fileName = "catalogo_" + System.currentTimeMillis() + ".jpg";
                    File outFile = new File(downloadsDir, fileName);
                    FileOutputStream fos = new FileOutputStream(outFile);
                    fos.write(imageData);
                    fos.flush();
                    fos.close();

                    Toast.makeText(MainActivity.this, "Imagen guardada en Descargas: " + fileName, Toast.LENGTH_LONG).show();
                } catch (Exception e2) {
                    Log.e(TAG, "Fallback save also failed", e2);
                    Toast.makeText(MainActivity.this, "No se pudo abrir la imagen", Toast.LENGTH_SHORT).show();
                }
            }
        }

        @JavascriptInterface
        public void downloadAndOpen(String url, String fileName) {
            Log.d(TAG, "downloadAndOpen: " + (url != null && url.length() > 100 ? url.substring(0, 100) : url) + " -> " + fileName);
            try {
                if (fileName == null || fileName.isEmpty()) {
                    fileName = "archivo";
                }
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setTitle(fileName);
                request.setDescription("Descargando " + fileName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                } else {
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                }
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                dm.enqueue(request);
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "downloadAndOpen error", e);
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e2) {
                    Log.e(TAG, "fallback also failed", e2);
                }
            }
        }

        @JavascriptInterface
        public void shareUrl(String url, String fileName, String description) {
            Log.d(TAG, "shareUrl: " + url);
            try {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_TEXT, url);
                if (description != null) {
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, description);
                }
                Intent chooser = Intent.createChooser(shareIntent, fileName != null ? fileName : "Compartir");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(chooser);
            } catch (Exception e) {
                Log.e(TAG, "shareUrl error", e);
            }
        }
    }
}
