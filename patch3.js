import fs from 'fs';
let content = fs.readFileSync('src/lib/billRenderer.ts', 'utf8');

const regex = /win\.document\.write\([\s\S]*?win\.document\.close\(\);\s*win\.focus\(\);\s*setTimeout\(\(\) => \{\s*win\.print\(\);\s*setTimeout\(\(\) => document\.body\.removeChild\(iframe\), 500\);\s*\}, 200\);\s*\}\s*\} catch \(err\) \{\s*console\.error\('printBillForChannel error:', err\);\s*\}\s*\}/;

const replacement = `      win.document.write(\`
        <html>
          <head>
            <title>\${billData.meta.label}</title>
            <style>\${pageCss}</style>
          </head>
          <body>\${html}</body>
        </html>
      \`);
      win.document.close();
      win.focus();

      const doPrint = () => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      };

      const images = Array.from(win.document.images);
      if (images.length === 0) {
        setTimeout(doPrint, 200);
      } else {
        let settledCount = 0;
        const total = images.length;
        // Safety fallback: print anyway after 3s even if some image 
        // never finishes loading (e.g. network hiccup), so printing 
        // never hangs indefinitely.
        const maxWaitTimer = setTimeout(doPrint, 3000);

        const onImageSettled = () => {
          settledCount++;
          if (settledCount >= total) {
            clearTimeout(maxWaitTimer);
            setTimeout(doPrint, 100);
          }
        };

        images.forEach((img: any) => {
          if (img.complete) {
            onImageSettled();
          } else {
            img.addEventListener('load', onImageSettled);
            img.addEventListener('error', onImageSettled);
          }
        });
      }
    }
  } catch (err) {
    console.error('printBillForChannel error:', err);
  }
}`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/lib/billRenderer.ts', content, 'utf8');
    console.log("Replaced successfully via regex.");
} else {
    console.log("COULD NOT FIND TARGET.");
}
