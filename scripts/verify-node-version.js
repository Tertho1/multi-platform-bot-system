import { spawn } from 'node:child_process';

const requiredVersion = '22.0.0';

function checkVersion() {
    const currentVersion = process.version.slice(1); // Remove 'v' prefix

    if (currentVersion.localeCompare(requiredVersion, undefined, { numeric: true }) < 0) {
        console.error(`Error: Node.js version ${requiredVersion} or higher is required.`);
        console.error(`Current version: ${currentVersion}`);
        process.exit(1);
    }

    // Check for important Node.js 22 features
    const features = [
        { name: 'Test Runner', code: 'node:test' },
        { name: 'WebCrypto', code: 'node:crypto' },
        { name: 'Fetch API', code: 'fetch' },
        { name: 'Web Streams', code: 'node:stream/web' }
    ];

    features.forEach(feature => {
        try {
            import(feature.code);
            console.log(`✓ ${feature.name} available`);
        } catch (error) {
            console.warn(`⚠ ${feature.name} not available: ${error.message}`);
        }
    });

    // Verify ES modules support
    if (import.meta.url) {
        console.log('✓ ES Modules support verified');
    }

    console.log(`✓ Using Node.js ${currentVersion}`);
}

// Run version check
checkVersion();