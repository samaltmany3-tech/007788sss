package com.eslam.sarf;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "AndroidBridge")
public class NativeFilesPlugin extends Plugin {
    static final String DEFAULT_DISPLAY_DIRECTORY = "Download/eslam";
    private static final String PREFERENCES = "sarf_native_files";
    private static final String TREE_URI_KEY = "export_tree_uri";

    @PluginMethod
    public void saveFile(PluginCall call) {
        try {
            String fileName = sanitizeFileName(required(call, "fileName"));
            String mimeType = required(call, "mimeType");
            byte[] bytes = decodeBase64(required(call, "base64"));
            Uri selectedTree = getSelectedTreeUri();
            FileResult result = selectedTree == null
                ? saveToDownloads(bytes, fileName, mimeType)
                : saveToTree(selectedTree, bytes, fileName, mimeType);
            call.resolve(result.toJsObject());
        } catch (Exception error) {
            call.reject(message(error, "تعذر حفظ الملف"), "SAVE_FAILED", error);
        }
    }

    @PluginMethod
    public void viewFile(PluginCall call) {
        try {
            String fileName = sanitizeFileName(required(call, "fileName"));
            String mimeType = required(call, "mimeType");
            byte[] bytes = decodeBase64(required(call, "base64"));

            File exportDirectory = new File(getContext().getCacheDir(), "exports");
            if (!exportDirectory.exists() && !exportDirectory.mkdirs()) {
                throw new IOException("تعذر إنشاء مجلد الملفات المؤقتة");
            }
            File file = new File(exportDirectory, fileName);
            try (OutputStream output = new FileOutputStream(file)) {
                output.write(bytes);
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            Intent viewIntent = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, mimeType)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(viewIntent, "فتح الملف باستخدام");
            if (viewIntent.resolveActivity(getContext().getPackageManager()) == null) {
                throw new IOException("لا يوجد تطبيق في الهاتف يستطيع فتح ملف PDF");
            }
            getActivity().startActivity(chooser);
            call.resolve(new FileResult(uri.toString(), fileName).toJsObject());
        } catch (Exception error) {
            call.reject(message(error, "تعذر فتح الملف"), "VIEW_FAILED", error);
        }
    }

    @PluginMethod
    public void chooseDirectory(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            .addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            .addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(call, intent, "directoryChosen");
    }

    @PluginMethod
    public void getDirectory(PluginCall call) {
        Uri uri = getSelectedTreeUri();
        JSObject result = new JSObject();
        if (uri == null) {
            result.put("uri", "");
            result.put("displayName", DEFAULT_DISPLAY_DIRECTORY);
        } else {
            result.put("uri", uri.toString());
            result.put("displayName", treeDisplayName(uri));
        }
        call.resolve(result);
    }

    @ActivityCallback
    private void directoryChosen(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("لم يتم اختيار مجلد", "DIRECTORY_CANCELLED");
            return;
        }
        try {
            Uri uri = result.getData().getData();
            int flags = result.getData().getFlags() &
                (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
            preferences().edit().putString(TREE_URI_KEY, uri.toString()).apply();
            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            response.put("displayName", treeDisplayName(uri));
            call.resolve(response);
        } catch (Exception error) {
            call.reject(message(error, "تعذر الاحتفاظ بصلاحية المجلد"), "DIRECTORY_FAILED", error);
        }
    }

    static String sanitizeFileName(String value) {
        if (value == null || value.trim().isEmpty()) throw new IllegalArgumentException("اسم الملف مطلوب");
        String sanitized = value.trim()
            .replaceAll("[\\\\/:*?\"<>|]+", "_")
            .replaceAll("\\.{2,}", "_")
            .replaceAll("^[_\\.]+", "");
        if (sanitized.isEmpty()) throw new IllegalArgumentException("اسم الملف غير صالح");
        return sanitized;
    }

    private String required(PluginCall call, String key) {
        String value = call.getString(key);
        if (value == null || value.isEmpty()) throw new IllegalArgumentException(key + " مطلوب");
        return value;
    }

    private byte[] decodeBase64(String value) {
        try {
            return Base64.decode(value, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("محتوى الملف غير صالح", error);
        }
    }

    private FileResult saveToDownloads(byte[] bytes, String fileName, String mimeType) throws IOException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, DEFAULT_DISPLAY_DIRECTORY);
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("تعذر إنشاء الملف داخل التنزيلات");
            try {
                try (OutputStream output = resolver.openOutputStream(uri, "w")) {
                    if (output == null) throw new IOException("تعذر فتح الملف للكتابة");
                    output.write(bytes);
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, values, null, null);
                return new FileResult(uri.toString(), DEFAULT_DISPLAY_DIRECTORY + "/" + fileName);
            } catch (Exception error) {
                resolver.delete(uri, null, null);
                throw error;
            }
        }

        File base = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (base == null) throw new IOException("مجلد التنزيلات غير متاح");
        File directory = new File(base, "eslam");
        if (!directory.exists() && !directory.mkdirs()) throw new IOException("تعذر إنشاء مجلد الحفظ");
        File file = new File(directory, fileName);
        try (OutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        }
        return new FileResult(Uri.fromFile(file).toString(), "ملفات التطبيق/Download/eslam/" + fileName);
    }

    private FileResult saveToTree(Uri treeUri, byte[] bytes, String fileName, String mimeType) throws IOException {
        DocumentFile directory = DocumentFile.fromTreeUri(getContext(), treeUri);
        if (directory == null || !directory.canWrite()) {
            preferences().edit().remove(TREE_URI_KEY).apply();
            throw new IOException("المجلد المحدد لم يعد متاحًا؛ اختره مرة أخرى");
        }
        DocumentFile oldFile = directory.findFile(fileName);
        if (oldFile != null) oldFile.delete();
        DocumentFile file = directory.createFile(mimeType, fileName);
        if (file == null) throw new IOException("تعذر إنشاء الملف في المجلد المحدد");
        try (OutputStream output = getContext().getContentResolver().openOutputStream(file.getUri(), "w")) {
            if (output == null) throw new IOException("تعذر فتح الملف للكتابة");
            output.write(bytes);
        }
        return new FileResult(file.getUri().toString(), treeDisplayName(treeUri) + "/" + fileName);
    }

    private Uri getSelectedTreeUri() {
        String value = preferences().getString(TREE_URI_KEY, null);
        return value == null ? null : Uri.parse(value);
    }

    private String treeDisplayName(Uri uri) {
        DocumentFile directory = DocumentFile.fromTreeUri(getContext(), uri);
        String name = directory == null ? null : directory.getName();
        return name == null || name.isEmpty() ? "المجلد المحدد" : name;
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Activity.MODE_PRIVATE);
    }

    private String message(Exception error, String fallback) {
        return error.getMessage() == null || error.getMessage().isEmpty() ? fallback : error.getMessage();
    }

    private static final class FileResult {
        private final String uri;
        private final String displayPath;

        private FileResult(String uri, String displayPath) {
            this.uri = uri;
            this.displayPath = displayPath;
        }

        private JSObject toJsObject() {
            JSObject result = new JSObject();
            result.put("uri", uri);
            result.put("displayPath", displayPath);
            return result;
        }
    }
}
