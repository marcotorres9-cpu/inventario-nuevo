package com.inventariopro.app;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.RecognizerIntent;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NativeBridge";
    private static final int MAX_B64_CHUNK = 500000;

    private String voiceCallbackInputId = null;
    private String voiceCallbackBtnId = null;
    private ActivityResultLauncher<Intent> voiceResultLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        webView.clearCache(true);
        webView.clearHistory();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
        }

        webView.addJavascriptInterface(new NativeBridge(), "NativeBridge");

        voiceResultLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            new ActivityResultCallback<ActivityResult>() {
                @Override
                public void onActivityResult(ActivityResult result) {
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                        if (matches != null && matches.size() > 0) {
                            String text = matches.get(0);
                            Log.d(TAG, "Voice result: " + text);
                            webViewEvaluateJavascript("window._voiceResult('" + escapeJs(text) + "','" + escapeJs(voiceCallbackInputId) + "','" + escapeJs(voiceCallbackBtnId) + "')");
                        } else {
                            webViewEvaluateJavascript("window._voiceError('No se detectó voz','" + escapeJs(voiceCallbackBtnId) + "')");
                        }
                    } else {
                        webViewEvaluateJavascript("window._voiceError('Cancelado','" + escapeJs(voiceCallbackBtnId) + "')");
                    }
                    voiceCallbackInputId = null;
                    voiceCallbackBtnId = null;
                }
            }
        );
    }

    private String escapeJs(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r");
    }

    private void webViewEvaluateJavascript(final String script) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView wv = getBridge().getWebView();
                    if (wv != null) wv.evaluateJavascript(script, null);
                } catch (Exception e) {
                    Log.e(TAG, "evaluateJS error", e);
                }
            }
        });
    }

    private void launchVoiceIntent() {
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Habla ahora...");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            voiceResultLauncher.launch(intent);
        } catch (ActivityNotFoundException e) {
            Log.e(TAG, "Speech recognition not available", e);
            webViewEvaluateJavascript("window._voiceError('Reconocimiento de voz no disponible','" + escapeJs(voiceCallbackBtnId) + "')");
            voiceCallbackInputId = null;
            voiceCallbackBtnId = null;
        }
    }

    public class NativeBridge {

        @JavascriptInterface
        public void startVoiceSearch(String inputId, String btnId) {
            Log.d(TAG, "startVoiceSearch: input=" + inputId + " btn=" + btnId);
            voiceCallbackInputId = inputId;
            voiceCallbackBtnId = btnId;
            launchVoiceIntent();
        }

        @JavascriptInterface
        public void nativeFetch(final int callbackId, String url, String method, String body) {
            Log.d(TAG, "nativeFetch[" + callbackId + "]: " + method + " " + (url != null && url.length() > 120 ? url.substring(0, 120) + "..." : url));
            new Thread(new Runnable() {
                @Override
                public void run() {
                    byte[] resultBytes = new byte[0];
                    int statusCode = 0;
                    try {
                        URL targetUrl = new URL(url);
                        HttpURLConnection conn = (HttpURLConnection) targetUrl.openConnection();
                        String m = method != null ? method : "GET";
                        conn.setRequestMethod(m);
                        conn.setRequestProperty("Content-Type", "application/json");
                        conn.setRequestProperty("Accept", "application/json");
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(20000);
                        conn.setInstanceFollowRedirects(true);

                        if (body != null && !body.isEmpty() && (m.equals("POST") || m.equals("PUT") || m.equals("PATCH"))) {
                            conn.setDoOutput(true);
                            byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
                            conn.getOutputStream().write(bodyBytes);
                            conn.getOutputStream().flush();
                            conn.getOutputStream().close();
                        }

                        statusCode = conn.getResponseCode();
                        InputStream is = conn.getErrorStream();
                        if (is == null) is = conn.getInputStream();
                        if (is == null) {
                            resultBytes = new byte[0];
                        } else {
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            byte[] buf = new byte[8192];
                            int len;
                            while ((len = is.read(buf)) != -1) baos.write(buf, 0, len);
                            is.close();
                            resultBytes = baos.toByteArray();
                        }
                        conn.disconnect();

                        final int finalStatus = statusCode;
                        final String b64 = Base64.encodeToString(resultBytes, Base64.NO_WRAP);

                        if (b64.length() <= MAX_B64_CHUNK) {
                            webViewEvaluateJavascript("window._nfb(" + callbackId + "," + finalStatus + ",'" + b64 + "');");
                        } else {
                            int totalChunks = (b64.length() + MAX_B64_CHUNK - 1) / MAX_B64_CHUNK;
                            final String finalB64 = b64;
                            final int finalTotalChunks = totalChunks;
                            webViewEvaluateJavascript("window._nfbStart(" + callbackId + "," + finalStatus + "," + finalTotalChunks + ");");
                            try { Thread.sleep(50); } catch (InterruptedException ie) {}
                            for (int ci = 0; ci < finalTotalChunks; ci++) {
                                final int start = ci * MAX_B64_CHUNK;
                                final int end = Math.min(start + MAX_B64_CHUNK, finalB64.length());
                                webViewEvaluateJavascript("window._nfbChunk(" + callbackId + "," + ci + ",'" + finalB64.substring(start, end) + "');");
                                if (ci < finalTotalChunks - 1) { try { Thread.sleep(20); } catch (InterruptedException ie) {} }
                            }
                            webViewEvaluateJavascript("window._nfbEnd(" + callbackId + ");");
                        }
                    } catch (final Exception e) {
                        Log.e(TAG, "nativeFetch[" + callbackId + "] error", e);
                        webViewEvaluateJavascript("window._nfc(" + callbackId + ",0,'ERROR');");
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public void openInBrowser(String url) {
            if (url == null || url.isEmpty()) return;
            if (url.startsWith("data:")) { openDataImage(url); return; }
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) { Log.e(TAG, "openInBrowser error", e); }
        }

        @JavascriptInterface
        public void openDataImage(String dataUri) {
            try {
                String base64Data; String mimeType = "image/png";
                if (dataUri.startsWith("data:")) {
                    int commaIdx = dataUri.indexOf(',');
                    if (commaIdx > 0) {
                        String header = dataUri.substring(0, commaIdx); base64Data = dataUri.substring(commaIdx + 1);
                        if (header.contains("image/jpeg") || header.contains("image/jpg")) mimeType = "image/jpeg";
                        else if (header.contains("image/png")) mimeType = "image/png";
                        else if (header.contains("image/webp")) mimeType = "image/webp";
                        else if (header.contains("image/gif")) mimeType = "image/gif";
                    } else { base64Data = dataUri.substring(5); }
                } else { base64Data = dataUri; }
                byte[] imageData = Base64.decode(base64Data, Base64.DEFAULT);
                String extension = ".jpg";
                if (mimeType.contains("png")) extension = ".png";
                else if (mimeType.contains("webp")) extension = ".webp";
                else if (mimeType.contains("gif")) extension = ".gif";
                File cacheDir = getCacheDir();
                String fileName = "catalogo_" + System.currentTimeMillis() + extension;
                File imageFile = new File(cacheDir, fileName);
                FileOutputStream fos = new FileOutputStream(imageFile); fos.write(imageData); fos.flush(); fos.close();
                Intent intent = new Intent(Intent.ACTION_VIEW);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    try {
                        Uri contentUri = FileProvider.getUriForFile(MainActivity.this, "com.inventariopro.app.fileprovider", imageFile);
                        intent.setDataAndType(contentUri, mimeType); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (Exception e) { intent.setDataAndType(Uri.fromFile(imageFile), mimeType); }
                } else { intent.setDataAndType(Uri.fromFile(imageFile), mimeType); }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "openDataImage error", e);
                try {
                    byte[] imageData = Base64.decode(dataUri.contains(",") ? dataUri.substring(dataUri.indexOf(',') + 1) : dataUri.substring(5), Base64.DEFAULT);
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    String fileName = "catalogo_" + System.currentTimeMillis() + ".jpg";
                    File outFile = new File(downloadsDir, fileName);
                    FileOutputStream fos = new FileOutputStream(outFile); fos.write(imageData); fos.flush(); fos.close();
                    Toast.makeText(MainActivity.this, "Imagen guardada en Descargas: " + fileName, Toast.LENGTH_LONG).show();
                } catch (Exception e2) { Toast.makeText(MainActivity.this, "No se pudo abrir la imagen", Toast.LENGTH_SHORT).show(); }
            }
        }

        @JavascriptInterface
        public void downloadAndOpen(String url, String fileName) {
            try {
                if (fileName == null || fileName.isEmpty()) fileName = "archivo";
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setTitle(fileName); request.setDescription("Descargando " + fileName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE); dm.enqueue(request);
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url)); intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(intent);
            } catch (Exception e) { Log.e(TAG, "downloadAndOpen error", e); }
        }

        @JavascriptInterface
        public void shareUrl(String url, String fileName, String description) {
            try {
                Intent shareIntent = new Intent(Intent.ACTION_SEND); shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_TEXT, url);
                if (description != null) shareIntent.putExtra(Intent.EXTRA_SUBJECT, description);
                Intent chooser = Intent.createChooser(shareIntent, fileName != null ? fileName : "Compartir");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(chooser);
            } catch (Exception e) { Log.e(TAG, "shareUrl error", e); }
        }

        private File writeBlobToCache(String base64Data, String fileName, String mimeType) throws Exception {
            byte[] data = Base64.decode(base64Data, Base64.NO_WRAP);
            if (fileName == null || fileName.isEmpty()) fileName = "archivo_" + System.currentTimeMillis();
            File outFile = new File(getCacheDir(), fileName);
            FileOutputStream fos = new FileOutputStream(outFile); fos.write(data); fos.flush(); fos.close();
            return outFile;
        }

        private Uri getShareUri(File file) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try { return FileProvider.getUriForFile(MainActivity.this, "com.inventariopro.app.fileprovider", file); }
                catch (Exception e) { return Uri.fromFile(file); }
            }
            return Uri.fromFile(file);
        }

        @JavascriptInterface
        public void saveBlobToDownloads(String base64Data, String fileName, String mimeType) {
            final String finalFileName = (fileName == null || fileName.isEmpty()) ? "archivo_" + System.currentTimeMillis() : fileName;
            final String finalMime = (mimeType == null || mimeType.isEmpty()) ? "application/octet-stream" : mimeType;
            try {
                byte[] data = Base64.decode(base64Data, Base64.NO_WRAP);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, finalFileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, finalMime);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    ContentResolver resolver = getContentResolver();
                    Uri itemUri = resolver.insert(MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values);
                    if (itemUri == null) throw new Exception("No se pudo crear entrada");
                    OutputStream os = resolver.openOutputStream(itemUri); os.write(data); os.flush(); os.close();
                    values.clear(); values.put(MediaStore.Downloads.IS_PENDING, 0); resolver.update(itemUri, values, null, null);
                } else {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!downloadsDir.exists()) downloadsDir.mkdirs();
                    File outFile = new File(downloadsDir, finalFileName);
                    FileOutputStream fos = new FileOutputStream(outFile); fos.write(data); fos.flush(); fos.close();
                    Intent mediaScan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE); mediaScan.setData(Uri.fromFile(outFile)); sendBroadcast(mediaScan);
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "\u2705 Guardado: " + finalFileName, Toast.LENGTH_LONG).show());
            } catch (final Exception e) {
                Log.e(TAG, "saveBlobToDownloads error", e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void shareBlob(String base64Data, String fileName, String mimeType, String description) {
            try {
                if (fileName == null || fileName.isEmpty()) fileName = "archivo_" + System.currentTimeMillis();
                if (mimeType == null || mimeType.isEmpty()) mimeType = "application/octet-stream";
                File file = writeBlobToCache(base64Data, fileName, mimeType);
                Uri contentUri = getShareUri(file);
                Intent shareIntent = new Intent(Intent.ACTION_SEND); shareIntent.setType(mimeType);
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                if (description != null && !description.isEmpty()) { shareIntent.putExtra(Intent.EXTRA_TEXT, description); shareIntent.putExtra(Intent.EXTRA_SUBJECT, fileName); }
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(shareIntent, "Compartir " + fileName); chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(chooser);
            } catch (Exception e) {
                Log.e(TAG, "shareBlob error", e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error al compartir", Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void openBlob(String base64Data, String fileName, String mimeType) {
            try {
                if (fileName == null || fileName.isEmpty()) fileName = "archivo_" + System.currentTimeMillis();
                if (mimeType == null || mimeType.isEmpty()) mimeType = "application/octet-stream";
                File file = writeBlobToCache(base64Data, fileName, mimeType);
                Uri contentUri = getShareUri(file);
                Intent viewIntent = new Intent(Intent.ACTION_VIEW); viewIntent.setDataAndType(contentUri, mimeType);
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(viewIntent);
            } catch (Exception e) {
                Log.e(TAG, "openBlob error", e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error al abrir", Toast.LENGTH_LONG).show());
            }
        }
    }
}
