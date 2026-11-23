#!/usr/bin/env python3
"""
AI Virtual HQ — Standalone Native Desktop Launcher (macOS / Windows / Linux)
Menjalankan server internal secara tersembunyi di 127.0.0.1 pada port acak,
membuka jendela aplikasi native, dan mematikan seluruh proses secara bersih saat ditutup.
"""
import os
import sys
import time
import threading
import webbrowser

# Wajib diset sebelum mengimpor server.py agar DATA_DIR & auth mode desktop aktif
os.environ.setdefault("APP_MODE", "desktop")
os.environ.setdefault("APP_HOST", "127.0.0.1")

import server as hq_server


def main():
    # Bind strictly to localhost on an OS-assigned free port (zero conflict, zero external exposure)
    httpd = hq_server.create_hq_server(host="127.0.0.1", port=0, start_heartbeat=False)
    port = httpd.server_address[1]
    url = f"http://127.0.0.1:{port}/"

    srv_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    srv_thread.start()

    prof = hq_server.load_company_profile()
    title = prof.get("companyName") or "AI Virtual HQ"

    try:
        import webview

        window = webview.create_window(
            title=f"{title} — AI Virtual HQ",
            url=url,
            width=1380,
            height=860,
            min_size=(1024, 680),
            background_color="#11121a",
            confirm_close=False,
        )
        webview.start(debug=False)
    except ImportError:
        print("Info: paket 'pywebview' belum terpasang. Install dengan: pip install -r requirements-desktop.txt")
        print(f"Membuka di browser lokal sebagai fallback: {url}")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        try:
            httpd.shutdown()
            httpd.server_close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
