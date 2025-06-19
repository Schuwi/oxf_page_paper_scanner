let video = document.getElementById('cam');
let inputCanvas = document.getElementById('canvasInput');
let outputCanvas = document.getElementById('canvasOutput');
let captureBtn = document.getElementById('capture');
let downloadLink = document.getElementById('download');

let templates = {};

// Add function to check camera permissions and provide diagnostics
async function checkCameraSupport() {
  const results = {
    mediaDevicesSupported: false,
    getUserMediaSupported: false,
    httpsConnection: false,
    availableDevices: 0,
    permissions: 'unknown'
  };

  // Check if we're on HTTPS or localhost
  results.httpsConnection = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // Check mediaDevices support
  results.mediaDevicesSupported = !!navigator.mediaDevices;
  results.getUserMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  if (results.getUserMediaSupported) {
    try {
      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      results.availableDevices = devices.filter(d => d.kind === 'videoinput').length;

      // Check permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        results.permissions = 'granted';
        // Stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          results.permissions = 'denied';
        } else if (e.name === 'NotFoundError') {
          results.permissions = 'no-device';
        } else {
          results.permissions = 'error: ' + e.name;
        }
      }
    } catch (e) {
      console.warn('Error checking camera support:', e);
    }
  }

  return results;
}

async function startCamera() {
  try {
    console.log('Starting camera...');

    // Check if video element exists
    if (!video) {
      throw new Error('Video element not found');
    }

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support camera access. Please use a modern browser with HTTPS.');
    }

    // Check available devices first
    let devices = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices.length);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found on this system');
      }
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }

    let stream = null;
    let cameraType = 'unknown';

    // Try different camera configurations in order of preference
    const cameraConfigs = [
      // First try environment facing mode (rear camera)
      {
        config: { video: { facingMode: 'environment' }, audio: false },
        name: 'environment-facing camera',
        type: 'environment'
      },
      // Then try user facing mode (front camera)
      {
        config: { video: { facingMode: 'user' }, audio: false },
        name: 'user-facing camera',
        type: 'user'
      },
      // Then try just video: true (any available camera)
      {
        config: { video: true, audio: false },
        name: 'default camera',
        type: 'default'
      },
      // Try with specific constraints that might work better
      {
        config: {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
          },
          audio: false
        },
        name: 'environment camera with resolution constraints',
        type: 'environment-constrained'
      }
    ];

    for (const { config, name, type } of cameraConfigs) {
      try {
        console.log(`Trying ${name}...`);
        stream = await navigator.mediaDevices.getUserMedia(config);
        cameraType = type;
        console.log(`Successfully obtained ${name}`);
        break;
      } catch (e) {
        console.warn(`Could not access ${name}:`, e.name, e.message);

        // Provide specific error messages for common issues
        if (e.name === 'NotFoundError') {
          console.warn('No camera device found for this configuration');
        } else if (e.name === 'NotAllowedError') {
          console.warn('Camera access denied by user');
        } else if (e.name === 'NotReadableError') {
          console.warn('Camera is already in use by another application');
        } else if (e.name === 'OverconstrainedError') {
          console.warn('Camera constraints cannot be satisfied');
        }
      }
    }

    if (!stream) {
      throw new Error('Could not access any camera. Please check:\n1. Camera permissions are granted\n2. No other applications are using the camera\n3. Camera is properly connected\n4. You are using HTTPS (required for camera access)');
    }

    video.srcObject = stream;
    console.log(`Camera stream obtained using ${cameraType} camera`);

    // Add event listeners to handle camera ready state
    video.addEventListener('loadedmetadata', () => {
      console.log('Camera stream loaded, resolution:', video.videoWidth, 'x', video.videoHeight);
      // Mark video as ready
      video.dataset.ready = "true";
    });

    video.addEventListener('playing', () => {
      console.log('Video is playing');
    });

    video.addEventListener('error', (e) => {
      console.error('Video element error:', e);
      alert('Video element error: ' + e);
    });

    // Make sure video plays
    try {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Auto-play prevented:', error);
          // Show play button or instructions for user to tap to start video
        });
      }
    } catch (e) {
      console.error('Error playing video:', e);
    }

    console.log('Camera access requested successfully');
  } catch (err) {
    console.error('Camera access error:', err);

    // Run diagnostics to provide better error information
    const diagnostics = await checkCameraSupport();
    console.log('Camera diagnostics:', diagnostics);

    // Provide more helpful error messages based on the error type and diagnostics
    let userMessage = 'Could not access camera: ' + err.message;

    if (err.name === 'NotAllowedError') {
      userMessage = 'Camera access denied. Please:\n1. Grant camera permissions when prompted\n2. Check browser settings to allow camera access\n3. Reload the page and try again';
    } else if (err.name === 'NotFoundError') {
      userMessage = 'No camera found. Please:\n1. Connect a camera to your device\n2. Check that your camera is working in other applications\n3. Try refreshing the page';
    } else if (err.name === 'NotReadableError') {
      userMessage = 'Camera is busy. Please:\n1. Close other applications using the camera\n2. Restart your browser\n3. Try again';
    } else if (err.name === 'SecurityError') {
      userMessage = 'Security error accessing camera. Please:\n1. Ensure you are using HTTPS\n2. Check that your browser supports camera access\n3. Try a different browser';
    }

    // Add diagnostic info
    userMessage += '\n\nDiagnostic Information:';
    userMessage += `\n• HTTPS/Secure context: ${diagnostics.httpsConnection ? 'Yes' : 'No'}`;
    userMessage += `\n• MediaDevices API support: ${diagnostics.mediaDevicesSupported ? 'Yes' : 'No'}`;
    userMessage += `\n• getUserMedia support: ${diagnostics.getUserMediaSupported ? 'Yes' : 'No'}`;
    userMessage += `\n• Available cameras: ${diagnostics.availableDevices}`;
    userMessage += `\n• Camera permissions: ${diagnostics.permissions}`;

    if (!diagnostics.httpsConnection) {
      userMessage += '\n\n⚠️ Camera access requires HTTPS. Try accessing this page via HTTPS or run on localhost.';
    }

    alert(userMessage);

    // Also show error in UI if there's an error display element
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = userMessage;
      errorDiv.style.display = 'block';
    }

    // Show retry button
    const retryBtn = document.getElementById('retry-camera');
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
    }
  }
}

function ensureTemplateImagesLoaded() {
  return new Promise((resolve, reject) => {
    const templateElements = ['tmpl_tl', 'tmpl_tr', 'tmpl_br', 'tmpl_bl'];
    const images = templateElements.map(id => document.getElementById(id));

    // Check if all images are already loaded
    if (images.every(img => img && img.complete && img.naturalHeight)) {
      resolve();
      return;
    }

    // Count loaded images
    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      if (loadedCount === images.length) {
        resolve();
      }
    };

    // Set up load and error handlers
    images.forEach((img, index) => {
      if (!img) {
        reject(new Error(`Template image ${templateElements[index]} element not found`));
        return;
      }

      if (img.complete && img.naturalHeight) {
        loadedCount++;
      } else {
        img.addEventListener('load', onLoad);
        img.addEventListener('error', () => {
          reject(new Error(`Failed to load ${templateElements[index]}`));
        });
      }
    });

    // If all were already loaded
    if (loadedCount === images.length) {
      resolve();
    }
  });
}

function loadTemplates() {
  try {
    // Verify OpenCV.js is properly initialized
    if (!cv || !cv.Mat || typeof cv.imread !== 'function') {
      throw new Error('OpenCV.js is not properly initialized yet');
    }

    console.log('Loading templates...');

    // Ensure all template images are loaded before proceeding
    ensureTemplateImagesLoaded()
      .then(() => {
        try {
          console.log('All template images confirmed loaded');
          // Continue with template loading
          const templateElements = ['tmpl_tl', 'tmpl_tr', 'tmpl_br', 'tmpl_bl'];
          for (const id of templateElements) {
            const img = document.getElementById(id);
            if (!img || !img.complete || !img.naturalHeight) {
              throw new Error(`Template image ${id} is not fully loaded`);
            }
          }

          // Load templates one by one with error checking
          try {
            templates.tl = cv.imread(document.getElementById('tmpl_tl'));
            console.log('Loaded template TL:', templates.tl.rows, 'x', templates.tl.cols);
          } catch (e) {
            console.error('Error loading TL template:', e);
            throw new Error('Failed to load TL template: ' + e.message);
          }

          try {
            templates.tr = cv.imread(document.getElementById('tmpl_tr'));
            console.log('Loaded template TR:', templates.tr.rows, 'x', templates.tr.cols);
          } catch (e) {
            console.error('Error loading TR template:', e);
            if (templates.tl) templates.tl.delete();
            throw new Error('Failed to load TR template: ' + e.message);
          }

          try {
            templates.br = cv.imread(document.getElementById('tmpl_br'));
            console.log('Loaded template BR:', templates.br.rows, 'x', templates.br.cols);
          } catch (e) {
            console.error('Error loading BR template:', e);
            if (templates.tl) templates.tl.delete();
            if (templates.tr) templates.tr.delete();
            throw new Error('Failed to load BR template: ' + e.message);
          }

          try {
            templates.bl = cv.imread(document.getElementById('tmpl_bl'));
            console.log('Loaded template BL:', templates.bl.rows, 'x', templates.bl.cols);
          } catch (e) {
            console.error('Error loading BL template:', e);
            if (templates.tl) templates.tl.delete();
            if (templates.tr) templates.tr.delete();
            if (templates.br) templates.br.delete();
            throw new Error('Failed to load BL template: ' + e.message);
          }

          // convert templates to gray
          for (const key in templates) {
            try {
              let mat = new cv.Mat();
              cv.cvtColor(templates[key], mat, cv.COLOR_RGBA2GRAY);
              templates[key].delete();
              templates[key] = mat;
              console.log(`Converted ${key} template to grayscale`);
            } catch (e) {
              console.error(`Error converting ${key} template to grayscale:`, e);
              // Clean up already created templates
              for (const k in templates) {
                if (templates[k]) templates[k].delete();
              }
              throw new Error(`Failed to convert ${key} template to grayscale: ${e.message}`);
            }
          }
          console.log('All templates loaded and converted successfully');
        } catch (err) {
          console.error('Error in loadTemplates:', err);
          alert('Failed to load template images: ' + err.message);
        }
      })
      .catch(err => {
        console.error('Error ensuring template images loaded:', err);
        alert('Failed to load template images: ' + err.message);
      });
  } catch (e) {
    console.error('Error in loadTemplates:', e);
    alert('Failed to initialize templates: ' + e.message);
  }
}

// onOpenCvReady function is now defined in the HTML file

// template‑matching utility
function findCorners(gray) {
  const resultPts = {};
  const method = cv.TM_CCOEFF_NORMED;
  const threshold = 0.60; // Slightly reduced threshold for better detection

  console.log('Starting corner detection with threshold:', threshold);

  for (const key in templates) {
    if (!templates[key] || !templates[key].cols) {
      throw new Error(`Template ${key} is invalid or not properly loaded`);
    }

    let tmpl = templates[key];
    let result = new cv.Mat();

    try {
      cv.matchTemplate(gray, tmpl, result, method);
      let { maxVal, maxLoc } = cv.minMaxLoc(result);
      result.delete();

      console.log(`Template ${key} match confidence: ${maxVal.toFixed(2)} at (${maxLoc.x}, ${maxLoc.y})`);

      if (maxVal < threshold) {
        throw new Error(`Low confidence for ${key}: ${maxVal.toFixed(2)} < ${threshold}`);
      }

      // Center of matched template
      resultPts[key] = {
        x: maxLoc.x + tmpl.cols / 2,
        y: maxLoc.y + tmpl.rows / 2
      };
    } catch (e) {
      console.error(`Error matching template ${key}:`, e);
      throw e;
    }
  }

  // Validate quadrilateral - check that the detected points form a reasonable shape
  if (Object.keys(resultPts).length === 4) {
    const { tl, tr, br, bl } = resultPts;

    // Simple check that points are in roughly correct positions relative to each other
    if (!(tl.x < tr.x && tl.y < bl.y && tr.x > br.x && br.y > tr.y)) {
      console.warn('Detected corners may not form a proper quadrilateral', resultPts);
    }
  }

  return resultPts;
}

captureBtn.addEventListener('click', () => {
  try {
    if (!cv || typeof cv.imread !== 'function') {
      throw new Error('OpenCV.js not properly loaded yet. Please wait a moment and try again.');
    }

    if (video.videoWidth === 0) {
      throw new Error('Camera not ready yet. Please ensure camera access is granted.');
    }

    console.log('Capturing frame from camera:', video.videoWidth, 'x', video.videoHeight);

    // Capture frame
    inputCanvas.width = video.videoWidth;
    inputCanvas.height = video.videoHeight;
    let ctx = inputCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, inputCanvas.width, inputCanvas.height);

    let src = cv.imread(inputCanvas);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let corners;
    try {
      corners = findCorners(gray);
      console.log('Corners detected:', corners);
    } catch (e) {
      console.error('Corner detection error:', e);
      alert('Detection error: ' + e.message);
      src.delete(); gray.delete();
      return;
    }
  } catch (e) {
    console.error('Capture error:', e);
    alert('Capture error: ' + e.message);
    return;
  }

  try {
    // Build srcPts in TL, TR, BR, BL order
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners.tl.x, corners.tl.y,
      corners.tr.x, corners.tr.y,
      corners.br.x, corners.br.y,
      corners.bl.x, corners.bl.y
    ]);
    console.log('Source points:', [
      [corners.tl.x, corners.tl.y],
      [corners.tr.x, corners.tr.y],
      [corners.br.x, corners.br.y],
      [corners.bl.x, corners.bl.y]
    ]);

    // Destination size (approx A4 1.414 ratio). 900×1270 fits nicely.
    let dstW = 900, dstH = 1270;
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      dstW, 0,
      dstW, dstH,
      0, dstH
    ]);

    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    let dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(dstW, dstH));

    // Display the result
    cv.imshow(outputCanvas, dst);
    console.log('Perspective transformation applied successfully');

    // Download link
    downloadLink.href = outputCanvas.toDataURL('image/png');
    downloadLink.download = 'scan.png';
    downloadLink.style.display = 'inline';

    // Clean up
    src.delete(); gray.delete(); srcPts.delete(); dstPts.delete(); M.delete(); dst.delete();
  } catch (e) {
    console.error('Error in perspective transformation:', e);
    alert('Error in perspective transformation: ' + e.message);

    // Clean up in case of error
    if (src) src.delete();
    if (gray) gray.delete();
  }
});

// Add retry camera button functionality
document.addEventListener('DOMContentLoaded', () => {
  const retryBtn = document.getElementById('retry-camera');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      console.log('Retrying camera access...');

      // Hide error message and retry button
      const errorDiv = document.getElementById('error-message');
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
      retryBtn.style.display = 'none';

      // Attempt to start camera again
      startCamera();
    });
  }
});
