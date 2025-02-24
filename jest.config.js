export default {
    testEnvironment: 'node',
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    setupFiles: ['<rootDir>/tests/setup.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/worker.js'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    verbose: true,
    transformIgnorePatterns: [
        'node_modules/(?!(@aws-sdk|discord.js|grammy)/)'
    ],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    testEnvironmentOptions: {
        url: 'http://localhost'
    },
    resolver: undefined
};