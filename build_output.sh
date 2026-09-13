cat /proc/$(pidof npm)/fd/1 2>/dev/null || cat /proc/$(pidof vite)/fd/1 2>/dev/null || cat /proc/$(pidof esbuild)/fd/1 2>/dev/null
