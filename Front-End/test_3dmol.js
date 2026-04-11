const puppeteer = require('puppeteer');

(async () => {
    // We launch puppeteer to test 3Dmol script
    console.log("Starting Chrome...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER_ERR:', err));
    
    console.log("Setting content...");
    await page.setContent(`
        <html>
        <head>
            <script src="https://3Dmol.csb.pitt.edu/build/3Dmol-min.js"></script>
        </head>
        <body>
            <div id="viewer" style="width: 500px; height: 500px; position:relative;"></div>
            <script>
                setTimeout(() => {
                    try {
                        const el = document.getElementById("viewer");
                        const viewer3d = $3Dmol.createViewer(el, {});
                        console.log("Viewer created");
                        
                        const pdb = "HEADER\\nATOM      1  N   VAL A   1     -21.894   8.903   4.127  1.00 11.99           N\\nEND";
                        viewer3d.addModel(pdb, "pdb");
                        viewer3d.setStyle({}, { cartoon: {} });
                        viewer3d.zoomTo();
                        viewer3d.render();
                        console.log("Render complete");
                    } catch(e) {
                        console.error("ERROR 3DMOL:", e);
                    }
                }, 1000);
            </script>
        </body>
        </html>
    `, {waitUntil: 'networkidle0'});
    
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
