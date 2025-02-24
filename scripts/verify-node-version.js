import { spawn } from 'node:child_process';

const requiredVersion = '22.0.0';
const currentVersion = process.version.slice(1); // Remove 'v' prefix

// Check Node.js version
function checkNodeVersion() {
    const [major] = currentVersion.split('.');
    const [reqMajor] = requiredVersion.split('.');

    if (parseInt(major) < parseInt(reqMajor)) {
        console.error(`Error: Node.js version ${requiredVersion} or higher is required. Current version: ${currentVersion}`);
        process.exit(1);
    }
}

// Verify required features
async function verifyFeatures() {
    // WebCrypto (required)
    if (typeof globalThis.crypto !== 'undefined') {
        console.log('✓ WebCrypto available');
    } else {
        console.error('✗ WebCrypto not available');
        process.exit(1);
    }

    // Fetch API (required)
    if (typeof globalThis.fetch === 'function') {
        console.log('✓ Fetch API available');
    } else {
        console.error('✗ Fetch API not available');
        process.exit(1);
    }

    // Web Streams (required)
    if (typeof globalThis.ReadableStream === 'function') {
        console.log('✓ Web Streams available');
    } else {
        console.error('✗ Web Streams not available');
        process.exit(1);
    }

    // ES Modules (required)
    if (import.meta.url) {
        console.log('✓ ES Modules support verified');
    } else {
        console.error('✗ ES Modules not supported');
        process.exit(1);
    }
}

async function main() {
    checkNodeVersion();
    await verifyFeatures();
    console.log(`✓ Using Node.js ${currentVersion}`);
}

main().catch(error => {
    console.error('Error during verification:', error);
    process.exit(1);
});