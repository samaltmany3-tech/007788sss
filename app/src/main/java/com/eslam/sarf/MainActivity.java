package com.eslam.sarf;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
