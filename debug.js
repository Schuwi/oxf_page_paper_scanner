// Simple debugging utility
function debugTemplateImages() {
    console.log('Debugging template images...');
    const templateIds = ['tmpl_tl', 'tmpl_tr', 'tmpl_br', 'tmpl_bl'];

    templateIds.forEach(id => {
        const img = document.getElementById(id);
        if (!img) {
            console.error(`Template ${id} element not found`);
            return;
        }

        console.log(`Template ${id}:`, {
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            src: img.src
        });

        // Draw the template on a canvas to verify it's loaded properly
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
            // Try to get the image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log(`${id} image data available:`, imageData.width, 'x', imageData.height);
        } catch (e) {
            console.error(`Error accessing ${id} image data:`, e);
        }
    });
}

function checkOpenCvStatus() {
    console.log('Checking OpenCV status...');
    if (typeof cv !== 'undefined') {
        console.log('cv object is available');
        console.log('cv.Mat exists:', typeof cv.Mat === 'function');
        console.log('cv.imread exists:', typeof cv.imread === 'function');
        console.log('cv.VERSION:', cv.VERSION);

        if (typeof cv.Mat === 'function') {
            try {
                const testMat = new cv.Mat(10, 10, cv.CV_8UC1);
                console.log('Successfully created a cv.Mat');
                testMat.delete();
            } catch (e) {
                console.error('Error creating cv.Mat:', e);
            }
        }
    } else {
        console.log('cv object is not available');
    }
}

// Add a debug button to the page
function addDebugButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Run Debug Tests';
    btn.style.marginLeft = '10px';
    btn.onclick = function () {
        checkOpenCvStatus();
        debugTemplateImages();
    };

    const controls = document.getElementById('controls');
    if (controls) {
        controls.appendChild(btn);
    }
}

// Add the debug button when the page loads
window.addEventListener('load', function () {
    addDebugButton();
});
