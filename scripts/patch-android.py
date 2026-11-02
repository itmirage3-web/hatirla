#!/usr/bin/env python3
"""`npx cap add android` sonrası çalışır: izinleri ekler, ikonları ve alarm sesini yerleştirir."""
import os
import shutil
import sys

ANDROID = 'android'
MANIFEST = os.path.join(ANDROID, 'app/src/main/AndroidManifest.xml')
RES = os.path.join(ANDROID, 'app/src/main/res')

PERMS = [
    '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
    '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
    '<uses-permission android:name="android.permission.VIBRATE" />',
    '<uses-permission android:name="android.permission.WAKE_LOCK" />',
]
QUERIES = (
    '<queries>\n'
    '        <intent><action android:name="android.speech.RecognitionService" /></intent>\n'
    '    </queries>'
)

if not os.path.exists(MANIFEST):
    sys.exit('AndroidManifest.xml bulunamadı: ' + MANIFEST)

xml = open(MANIFEST, encoding='utf8').read()
add = []
for p in PERMS:
    name = p.split('android:name="')[1].split('"')[0]
    if name not in xml:
        add.append('    ' + p)
if '<queries>' not in xml:
    add.append('    ' + QUERIES)
if add:
    xml = xml.replace('</manifest>', '\n'.join(add) + '\n</manifest>')
    open(MANIFEST, 'w', encoding='utf8').write(xml)
print('Manifest güncellendi, eklenen satır:', len(add))

# Uyarlanabilir ikon tanımını kaldır, yerine hazır PNG ikonlar gelsin
anydpi = os.path.join(RES, 'mipmap-anydpi-v26')
if os.path.isdir(anydpi):
    shutil.rmtree(anydpi)

# Overlay dosyalarını res klasörüne kopyala
src = 'android-overlay/res'
count = 0
for root, _, files in os.walk(src):
    for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, src)
        dst = os.path.join(RES, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(full, dst)
        count += 1
print('Kopyalanan kaynak dosyası:', count)
